import { Response } from 'express';
import { Attendance } from '../models/Attendance';
import { IRequestWithUser } from '../middleware/auth';

// Geofence center (e.g. School Campus Coordinates)
const SCHOOL_LAT = parseFloat(process.env.SCHOOL_LAT || '28.6139'); // Default New Delhi as sample
const SCHOOL_LON = parseFloat(process.env.SCHOOL_LON || '77.2090');
const GEOFENCE_RADIUS_METERS = parseInt(process.env.GEOFENCE_RADIUS_METERS || '200', 10);

// Haversine Formula to compute distance between two GPS coordinates in meters
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export class AttendanceController {
  // Clock In
  public static async clockIn(req: IRequestWithUser, res: Response) {
    try {
      const { latitude, longitude, address } = req.body;
      const userId = req.user?._id;

      if (!latitude || !longitude) {
        return res.status(400).json({ message: 'GPS coordinates (latitude and longitude) are required.' });
      }

      // Check distance from school
      const distance = calculateDistance(latitude, longitude, SCHOOL_LAT, SCHOOL_LON);
      const isOutsideGeofence = distance > GEOFENCE_RADIUS_METERS;

      // Get current date string (YYYY-MM-DD)
      const today = new Date().toISOString().split('T')[0];

      // Check if already clocked in today
      const existingRecord = await Attendance.findOne({ userId, date: today });
      if (existingRecord) {
        return res.status(400).json({ message: 'You have already clocked in today.' });
      }

      // Determine status (e.g. late check-in if after 9:00 AM)
      const now = new Date();
      const nineAM = new Date();
      nineAM.setHours(9, 0, 0, 0);
      const status = now > nineAM ? 'late' : 'present';

      const attendance = new Attendance({
        userId,
        date: today,
        clockIn: now,
        gpsClockIn: { latitude, longitude, address },
        status,
        locationHistory: [{ latitude, longitude, timestamp: now }],
      });

      await attendance.save();

      return res.status(201).json({
        message: 'Clocked in successfully.',
        outsideGeofence: isOutsideGeofence,
        distanceFromCenterMeters: Math.round(distance),
        attendance,
      });
    } catch (error: any) {
      console.error('Clock-in error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error during clock-in.'  });
    }
  }

  // Clock Out
  public static async clockOut(req: IRequestWithUser, res: Response) {
    try {
      const { latitude, longitude, address } = req.body;
      const userId = req.user?._id;

      if (!latitude || !longitude) {
        return res.status(400).json({ message: 'GPS coordinates (latitude and longitude) are required.' });
      }

      const today = new Date().toISOString().split('T')[0];
      const attendance = await Attendance.findOne({ userId, date: today });

      if (!attendance) {
        return res.status(400).json({ message: 'You must clock in first before clocking out.' });
      }

      if (attendance.clockOut) {
        return res.status(400).json({ message: 'You have already clocked out today.' });
      }

      attendance.clockOut = new Date();
      attendance.gpsClockOut = { latitude, longitude, address };
      attendance.locationHistory.push({ latitude, longitude, timestamp: new Date() });

      await attendance.save();

      return res.status(200).json({
        message: 'Clocked out successfully.',
        attendance,
      });
    } catch (error: any) {
      console.error('Clock-out error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error during clock-out.'  });
    }
  }

  // Get Attendance History (User or Admin query)
  public static async getAttendance(req: IRequestWithUser, res: Response) {
    try {
      const { userId, date, startDate, endDate } = req.query;
      const filter: any = {};

      // Regular users can only see their own attendance
      if (req.user?.role !== 'super_admin' && req.user?.role !== 'principal') {
        filter.userId = req.user?._id;
      } else if (userId) {
        filter.userId = userId;
      }

      if (date) {
        filter.date = date;
      } else if (startDate && endDate) {
        filter.date = { $gte: startDate, $lte: endDate };
      }

      const records = await Attendance.find(filter)
        .populate('userId', 'username employeeId role department')
        .sort({ date: -1 });

      return res.status(200).json(records);
    } catch (error: any) {
      console.error('Get attendance error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.'  });
    }
  }

  // Update Location Breadcrumb (Real-time GPS Tracking)
  public static async trackLocation(req: IRequestWithUser, res: Response) {
    try {
      const { latitude, longitude } = req.body;
      const userId = req.user?._id;

      if (!latitude || !longitude) {
        return res.status(400).json({ message: 'Coordinates are required.' });
      }

      const today = new Date().toISOString().split('T')[0];
      const attendance = await Attendance.findOne({ userId, date: today });

      if (!attendance) {
        return res.status(404).json({ message: 'No active attendance session for today.' });
      }

      attendance.locationHistory.push({
        latitude,
        longitude,
        timestamp: new Date(),
      });

      await attendance.save();

      // Emit live coordinates via Sockets (useful for real-time tracking)
      const io = req.app.get('io');
      if (io) {
        io.emit('user_location_updated', {
          userId,
          username: req.user?.username,
          latitude,
          longitude,
          timestamp: new Date(),
        });
      }

      return res.status(200).json({ message: 'Location synchronized.' });
    } catch (error: any) {
      console.error('Track location error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.'  });
    }
  }
}
export default AttendanceController;
