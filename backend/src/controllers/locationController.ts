import { Response } from 'express';
import { IRequestWithUser } from '../middleware/auth';
import LiveLocation from '../models/LiveLocation';
import LocationHistory from '../models/LocationHistory';
import AuditLog from '../models/AuditLog';
import Task from '../models/Task';
import { decrypt, encrypt } from '../utils/crypto';
import User from '../models/User';
import { addNotificationJob } from '../services/queueService';

// Haversine formula to compute distance in meters
function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const rad1 = (lat1 * Math.PI) / 180;
  const rad2 = (lat2 * Math.PI) / 180;
  const diffLat = ((lat2 - lat1) * Math.PI) / 180;
  const diffLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(diffLat / 2) * Math.sin(diffLat / 2) +
    Math.cos(rad1) * Math.cos(rad2) * Math.sin(diffLon / 2) * Math.sin(diffLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export class LocationController {
  public static async startOrUpdateSharing(req: IRequestWithUser, res: Response) {
    try {
      const { taskId, latitude, longitude, accuracy, status, sharingType } = req.body;
      const userId = req.user?._id;

      if (latitude === undefined || longitude === undefined || !sharingType) {
        return res.status(400).json({ message: 'Latitude, longitude and sharingType are required.' });
      }

      // Calculate expiration time if needed
      let expiresAt: Date | undefined = undefined;
      const now = new Date();
      if (sharingType === '15mins') {
        expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
      } else if (sharingType === '30mins') {
        expiresAt = new Date(now.getTime() + 30 * 60 * 1000);
      }

      // Find or create live location entry
      let live = await LiveLocation.findOne({ userId });
      const isNewStart = !live;

      const encryptedLat = encrypt(latitude.toString());
      const encryptedLon = encrypt(longitude.toString());

      if (isNewStart) {
        live = new LiveLocation({
          userId,
          taskId,
          latitude: encryptedLat,
          longitude: encryptedLon,
          accuracy,
          status: status || 'Travelling',
          sharingType,
          expiresAt,
        });
        await live.save();

        // Audit log
        await AuditLog.create({
          actorId: userId,
          action: 'LOCATION_SHARE_START',
          details: `Started location sharing (${sharingType}) for task: ${taskId || 'None'}`,
          ipAddress: req.ip || '127.0.0.1',
        });

        // Notify admins
        const admins = await User.find({ role: { $in: ['super_admin', 'principal'] } });
        if (admins.length > 0) {
          await addNotificationJob(
            admins.map((a) => a._id.toString()),
            '📍 Location Sharing Started',
            `Teacher ${req.user.username} started sharing location for task: ${taskId || 'General Duty'}.`,
            { userId: userId.toString(), type: 'LOCATION_SHARE_START' }
          );
        }
      } else {
        live!.taskId = taskId || live!.taskId;
        live!.latitude = encryptedLat;
        live!.longitude = encryptedLon;
        live!.accuracy = accuracy;
        live!.status = status || live!.status;
        live!.sharingType = sharingType;
        live!.expiresAt = expiresAt;
        await live!.save();
      }

      // Handle Location History for Task
      if (taskId) {
        let history = await LocationHistory.findOne({ userId, taskId });
        if (!history) {
          history = new LocationHistory({
            userId,
            taskId,
            startLocation: {
              latitude: encryptedLat,
              longitude: encryptedLon,
            },
            route: [
              {
                latitude: encryptedLat,
                longitude: encryptedLon,
                timestamp: new Date(),
              },
            ],
            duration: 0,
            distance: 0,
          });
          await history.save();
        } else {
          // Calculate distance from last point
          const routePoints = history.getRoutePoints();
          let distanceDelta = 0;
          if (routePoints.length > 0) {
            const lastPoint = routePoints[routePoints.length - 1];
            distanceDelta = getHaversineDistance(lastPoint.latitude, lastPoint.longitude, latitude, longitude);
          }

          history.addRoutePoint(latitude, longitude);
          history.distance = (history.distance || 0) + distanceDelta;

          // Update duration in minutes
          const startTime = new Date(history.createdAt).getTime();
          const durationMins = Math.round((new Date().getTime() - startTime) / 60000);
          history.duration = durationMins;

          await history.save();
        }
      }

      // Broadcast update via Socket.IO
      const io = req.app.get('io');
      if (io) {
        io.emit('location_updated', {
          userId,
          username: req.user.username,
          department: req.user.department,
          taskId,
          latitude,
          longitude,
          accuracy,
          status: status || 'Travelling',
          lastUpdated: new Date(),
        });
      }

      return res.status(200).json({ message: 'Location updated successfully.', expiresAt });
    } catch (error: any) {
      console.error('Start/update location sharing error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.'  });
    }
  }

  public static async stopSharing(req: IRequestWithUser, res: Response) {
    try {
      const userId = req.user?._id;
      const live = await LiveLocation.findOneAndDelete({ userId });

      if (live) {
        // Complete History route if tied to task
        if (live.taskId) {
          const history = await LocationHistory.findOne({ userId, taskId: live.taskId });
          if (history) {
            history.endLocation = {
              latitude: live.latitude,
              longitude: live.longitude,
            };
            const startTime = new Date(history.createdAt).getTime();
            history.duration = Math.round((new Date().getTime() - startTime) / 60000);
            await history.save();
          }
        }

        // Audit Log
        await AuditLog.create({
          actorId: userId,
          action: 'LOCATION_SHARE_STOP',
          details: `Stopped location sharing.`,
          ipAddress: req.ip || '127.0.0.1',
        });

        // Notify admins
        const admins = await User.find({ role: { $in: ['super_admin', 'principal'] } });
        if (admins.length > 0) {
          await addNotificationJob(
            admins.map((a) => a._id.toString()),
            '📍 Location Sharing Stopped',
            `Teacher ${req.user.username} stopped sharing location.`,
            { userId: userId.toString(), type: 'LOCATION_SHARE_STOP' }
          );
        }

        // Broadcast stop via Socket.IO
        const io = req.app.get('io');
        if (io) {
          io.emit('location_stopped', { userId });
        }
      }

      return res.status(200).json({ message: 'Location sharing revoked successfully.' });
    } catch (error: any) {
      console.error('Stop location sharing error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.'  });
    }
  }

  public static async getLiveLocations(req: IRequestWithUser, res: Response) {
    try {
      // Find active locations
      const liveList = await LiveLocation.find()
        .populate('userId', 'username department role')
        .populate('taskId', 'title');

      // Filter expired sharing configurations and clean/decrypt coordinates on-the-fly
      const now = new Date();
      const activeList = [];

      for (const item of liveList) {
        if (item.expiresAt && item.expiresAt < now) {
          // Clean up expired location sharing session
          await LiveLocation.findByIdAndDelete(item._id);
          const io = req.app.get('io');
          if (io) {
            io.emit('location_stopped', { userId: item.userId });
          }
          continue;
        }

        const coords = item.getCoords();
        activeList.push({
          userId: (item.userId as any)._id,
          username: (item.userId as any).username,
          department: (item.userId as any).department,
          role: (item.userId as any).role,
          taskId: (item.taskId as any)?._id || null,
          taskTitle: (item.taskId as any)?.title || 'General Duty',
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: item.accuracy,
          status: item.status,
          updatedAt: item.updatedAt,
        });
      }

      // Log admin view audit
      await AuditLog.create({
        actorId: req.user?._id,
        action: 'LOCATION_VIEW',
        details: `Administrator viewed live locations of active staff.`,
        ipAddress: req.ip || '127.0.0.1',
      });

      return res.status(200).json(activeList);
    } catch (error: any) {
      console.error('Get live locations error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.'  });
    }
  }

  public static async getTaskHistory(req: IRequestWithUser, res: Response) {
    try {
      const { taskId } = req.params;

      const histories = await LocationHistory.find({ taskId })
        .populate('userId', 'username department role');

      const formatted = histories.map((hist) => {
        const route = hist.getRoutePoints();
        const start = {
          latitude: parseFloat(decrypt(hist.startLocation.latitude)),
          longitude: parseFloat(decrypt(hist.startLocation.longitude)),
        };
        const end = hist.endLocation
          ? {
              latitude: parseFloat(decrypt(hist.endLocation.latitude)),
              longitude: parseFloat(decrypt(hist.endLocation.longitude)),
            }
          : undefined;

        return {
          _id: hist._id,
          userId: (hist.userId as any)._id,
          username: (hist.userId as any).username,
          department: (hist.userId as any).department,
          role: (hist.userId as any).role,
          startLocation: start,
          endLocation: end,
          route,
          duration: hist.duration,
          distance: hist.distance,
          createdAt: hist.createdAt,
        };
      });

      // Log admin view audit
      await AuditLog.create({
        actorId: req.user?._id,
        action: 'LOCATION_VIEW',
        details: `Administrator viewed location history logs for task ID: ${taskId}`,
        ipAddress: req.ip || '127.0.0.1',
      });

      return res.status(200).json(formatted);
    } catch (error: any) {
      console.error('Get task history error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.'  });
    }
  }
}
