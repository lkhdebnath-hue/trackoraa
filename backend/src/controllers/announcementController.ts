import { Response } from 'express';
import { IRequestWithUser } from '../middleware/auth';
import Announcement from '../models/Announcement';
import AuditLog from '../models/AuditLog';

export class AnnouncementController {
  public static async create(req: IRequestWithUser, res: Response) {
    try {
      const { title, content, targetRoles } = req.body;

      if (!title || !content) {
        return res.status(400).json({ message: 'Title and content are required.' });
      }

      const announcement = new Announcement({
        title,
        content,
        authorId: req.user?._id,
        targetRoles: targetRoles || ['all'],
      });

      await announcement.save();

      // Populate author details for display
      const populated = await announcement.populate('authorId', 'username');

      // Broadcast via Socket.IO
      const io = req.app.get('io');
      if (io) {
        io.emit('announcement_created', {
          _id: populated._id,
          title: populated.title,
          content: populated.content,
          targetRoles: populated.targetRoles,
          createdAt: populated.createdAt,
          author: {
            username: (populated.authorId as any).username,
          },
        });
      }

      // Audit Log
      await AuditLog.create({
        actorId: req.user?._id,
        action: 'ANNOUNCEMENT_CREATE',
        details: `Created announcement: "${title}"`,
        ipAddress: req.ip || '127.0.0.1',
      });

      const formatted = {
        _id: populated._id,
        title: populated.title,
        content: populated.content,
        targetRoles: populated.targetRoles,
        createdAt: populated.createdAt,
        author: {
          username: (populated.authorId as any).username,
        },
      };

      return res.status(201).json(formatted);
    } catch (error: any) {
      console.error('Create announcement error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.'  });
    }
  }

  public static async getAll(req: IRequestWithUser, res: Response) {
    try {
      const userRole = req.user.role;
      const isAdmin = ['super_admin', 'principal'].includes(userRole);

      // Admin sees all, others see 'all' or their role
      const query = isAdmin 
        ? {} 
        : {
            $or: [
              { targetRoles: 'all' },
              { targetRoles: userRole },
            ],
          };

      const announcements = await Announcement.find(query)
        .populate('authorId', 'username')
        .sort({ createdAt: -1 })
        .limit(20);

      // Map to normalize author structure for client consumption
      const formatted = announcements.map((ann) => ({
        _id: ann._id,
        title: ann.title,
        content: ann.content,
        targetRoles: ann.targetRoles,
        createdAt: ann.createdAt,
        author: {
          username: (ann.authorId as any)?.username || 'System',
        },
      }));

      return res.status(200).json(formatted);
    } catch (error: any) {
      console.error('Get announcements error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.'  });
    }
  }

  public static async delete(req: IRequestWithUser, res: Response) {
    try {
      const { id } = req.params;
      const announcement = await Announcement.findByIdAndDelete(id);
      if (!announcement) {
        return res.status(404).json({ message: 'Announcement not found.' });
      }

      // Audit Log
      await AuditLog.create({
        actorId: req.user?._id,
        action: 'ANNOUNCEMENT_DELETE',
        details: `Deleted announcement: "${announcement.title}"`,
        ipAddress: req.ip || '127.0.0.1',
      });

      return res.status(200).json({ message: 'Announcement deleted successfully.' });
    } catch (error: any) {
      console.error('Delete announcement error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.'  });
    }
  }
}
