import { Response } from 'express';
import { AuditLog } from '../models/AuditLog';
import { IRequestWithUser } from '../middleware/auth';

export class LogController {
  // Get Audit Logs (Admin Only)
  public static async getLogs(req: IRequestWithUser, res: Response) {
    try {
      const { search, action, actorId, limit = 100 } = req.query;
      const filter: any = {};

      if (action) {
        filter.action = action;
      }
      if (actorId) {
        filter.actorId = actorId;
      }
      if (search) {
        filter.$or = [
          { details: { $regex: search, $options: 'i' } },
          { ipAddress: { $regex: search, $options: 'i' } },
        ];
      }

      const logs = await AuditLog.find(filter)
        .populate('actorId', 'username employeeId role')
        .sort({ timestamp: -1 })
        .limit(Number(limit));

      return res.status(200).json(logs);
    } catch (error: any) {
      console.error('Get logs error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.'  });
    }
  }
}
export default LogController;
