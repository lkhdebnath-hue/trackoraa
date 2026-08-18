import { Response } from 'express';
import { Goal } from '../models/Goal';
import { IRequestWithUser } from '../middleware/auth';

export class GoalController {
  public static async createGoal(req: IRequestWithUser, res: Response) {
    try {
      const { title, description, category, color, targetDate, milestones } = req.body;
      if (!title) return res.status(400).json({ message: 'Title is required' });

      const goal = new Goal({
        user: req.user?._id,
        title,
        description,
        category,
        color,
        targetDate,
        milestones: milestones || [],
      });

      await goal.save();
      return res.status(201).json(goal);
    } catch (error: any) {
      console.error('Create goal error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error'  });
    }
  }

  public static async getGoals(req: IRequestWithUser, res: Response) {
    try {
      const goals = await Goal.find({ user: req.user?._id })
        .populate('linkedTasks', 'title status')
        .populate('linkedHabits', 'title currentStreak')
        .sort({ targetDate: 1 });
      return res.status(200).json(goals);
    } catch (error: any) {
      console.error('Get goals error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error'  });
    }
  }

  public static async updateGoal(req: IRequestWithUser, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Calculate progress based on milestones if provided
      if (updates.milestones && updates.milestones.length > 0) {
        const completed = updates.milestones.filter((m: any) => m.isCompleted).length;
        updates.progress = Math.round((completed / updates.milestones.length) * 100);
        
        if (updates.progress === 100 && updates.status !== 'completed') {
          updates.status = 'completed';
        }
      }

      const goal = await Goal.findOneAndUpdate(
        { _id: id, user: req.user?._id },
        updates,
        { new: true }
      ).populate('linkedTasks').populate('linkedHabits');
      
      if (!goal) return res.status(404).json({ message: 'Goal not found' });
      return res.status(200).json(goal);
    } catch (error: any) {
      console.error('Update goal error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error'  });
    }
  }

  public static async deleteGoal(req: IRequestWithUser, res: Response) {
    try {
      const { id } = req.params;
      const goal = await Goal.findOneAndDelete({ _id: id, user: req.user?._id });
      if (!goal) return res.status(404).json({ message: 'Goal not found' });
      return res.status(200).json({ message: 'Goal deleted' });
    } catch (error: any) {
      console.error('Delete goal error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error'  });
    }
  }
}
