import { Response } from 'express';
import { Task } from '../models/Task';
import { Attendance } from '../models/Attendance';
import { ReportService } from '../services/reportService';
import { IRequestWithUser } from '../middleware/auth';

export class ReportController {
  // Export Tasks Report (PDF or Excel)
  public static async exportTasks(req: IRequestWithUser, res: Response) {
    try {
      const { format, priority, status, category } = req.query;
      const filter: any = {};

      if (priority) filter.priority = priority;
      if (status) filter.status = status;
      if (category) filter.category = category;

      const tasks = await Task.find(filter).populate('creator assignees');

      if (format === 'excel') {
        const buffer = ReportService.generateTasksExcel(tasks);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=tasks_report.xlsx');
        return res.status(200).send(buffer);
      } else {
        // PDF default
        const buffer = await ReportService.generateTasksPdf(tasks);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=tasks_report.pdf');
        return res.status(200).send(buffer);
      }
    } catch (error: any) {
      console.error('Export tasks report error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Failed to generate tasks report.'  });
    }
  }

  // Export Attendance Report (PDF or Excel)
  public static async exportAttendance(req: IRequestWithUser, res: Response) {
    try {
      const { format, userId, date, startDate, endDate } = req.query;
      const filter: any = {};

      if (userId) filter.userId = userId;
      if (date) filter.date = date;
      else if (startDate && endDate) {
        filter.date = { $gte: startDate, $lte: endDate };
      }

      const records = await Attendance.find(filter).populate('userId', 'username employeeId role department');

      if (format === 'excel') {
        const buffer = ReportService.generateAttendanceExcel(records);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.xlsx');
        return res.status(200).send(buffer);
      } else {
        // PDF default
        const buffer = await ReportService.generateAttendancePdf(records);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.pdf');
        return res.status(200).send(buffer);
      }
    } catch (error: any) {
      console.error('Export attendance report error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Failed to generate attendance report.'  });
    }
  }
}
export default ReportController;
