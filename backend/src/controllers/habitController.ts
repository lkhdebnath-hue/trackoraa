import { Response } from 'express';
import { Habit } from '../models/Habit';
import { HabitLog } from '../models/HabitLog';
import { IRequestWithUser } from '../middleware/auth';
import moment from 'moment';

export class HabitController {
  // Create Habit
  public static async createHabit(req: IRequestWithUser, res: Response) {
    try {
      const { title, description, frequency, customDays, category, color, icon, reminderTime } = req.body;
      if (!title) return res.status(400).json({ message: 'Title is required' });

      const habit = new Habit({
        user: req.user?._id,
        title,
        description,
        frequency,
        customDays,
        category,
        color,
        icon,
        reminderTime,
      });

      await habit.save();
      return res.status(201).json(habit);
    } catch (error: any) {
      console.error('Create habit error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error'  });
    }
  }

  // Get User's Habits
  public static async getHabits(req: IRequestWithUser, res: Response) {
    try {
      const habits = await Habit.find({ user: req.user?._id, status: { $ne: 'archived' } }).sort({ createdAt: -1 });
      return res.status(200).json(habits);
    } catch (error: any) {
      console.error('Get habits error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error'  });
    }
  }

  // Update Habit
  public static async updateHabit(req: IRequestWithUser, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const habit = await Habit.findOneAndUpdate({ _id: id, user: req.user?._id }, updates, { new: true });
      if (!habit) return res.status(404).json({ message: 'Habit not found' });
      return res.status(200).json(habit);
    } catch (error: any) {
      console.error('Update habit error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error'  });
    }
  }

  // Delete Habit
  public static async deleteHabit(req: IRequestWithUser, res: Response) {
    try {
      const { id } = req.params;
      const habit = await Habit.findOneAndDelete({ _id: id, user: req.user?._id });
      if (!habit) return res.status(404).json({ message: 'Habit not found' });
      await HabitLog.deleteMany({ habit: id });
      return res.status(200).json({ message: 'Habit deleted' });
    } catch (error: any) {
      console.error('Delete habit error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error'  });
    }
  }

  // Log Habit Completion
  public static async logHabit(req: IRequestWithUser, res: Response) {
    try {
      const { id } = req.params;
      const { date, status, notes } = req.body; // date in YYYY-MM-DD
      
      if (!date || !status) return res.status(400).json({ message: 'Date and status required' });

      const habit = await Habit.findOne({ _id: id, user: req.user?._id });
      if (!habit) return res.status(404).json({ message: 'Habit not found' });

      // Upsert the log
      const log = await HabitLog.findOneAndUpdate(
        { habit: id, user: req.user?._id, date },
        { status, notes },
        { upsert: true, new: true }
      );

      // Recalculate streak logic
      // In a production app, we would query the last N days from HabitLog to rebuild streak
      // For performance, we'll do a simple rebuild of current streak
      const allLogs = await HabitLog.find({ habit: id, status: 'completed' }).sort({ date: -1 });
      
      let currentStreak = 0;
      let checkDate = moment(date); // Start checking backwards from the logged date

      for (let i = 0; i < allLogs.length; i++) {
        if (allLogs[i].date === checkDate.format('YYYY-MM-DD')) {
          currentStreak++;
          checkDate = checkDate.subtract(1, 'days');
        } else {
          break; // Streak broken
        }
      }

      habit.currentStreak = currentStreak;
      if (currentStreak > habit.longestStreak) habit.longestStreak = currentStreak;
      habit.totalCompletions = allLogs.length;
      await habit.save();

      return res.status(200).json({ habit, log });
    } catch (error: any) {
      console.error('Log habit error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error'  });
    }
  }

  // Get Habit Logs (for calendar visualization)
  public static async getHabitLogs(req: IRequestWithUser, res: Response) {
    try {
      const { start, end } = req.query; // YYYY-MM-DD
      if (!start || !end) return res.status(400).json({ message: 'Start and end dates required' });

      const logs = await HabitLog.find({
        user: req.user?._id,
        date: { $gte: start as string, $lte: end as string }
      });
      return res.status(200).json(logs);
    } catch (error: any) {
      console.error('Get habit logs error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error'  });
    }
  }
}
