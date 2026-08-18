import { Response } from 'express';
import { Task } from '../models/Task';
import { Group } from '../models/Chat';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { IRequestWithUser } from '../middleware/auth';
import { addNotificationJob } from '../services/queueService';

export class TaskController {
  // Create Task (Admin/Teacher/Coordinator)
  public static async createTask(req: IRequestWithUser, res: Response) {
    try {
      const {
        title,
        description,
        assignees,
        teams,
        priority,
        category,
        labels,
        colorTag,
        dueDate,
        reminderDate,
        estimatedTime,
        dependencies,
        subtasks,
        approvalRequired,
        customFields,
      } = req.body;

      if (!title || !description || !category || !dueDate) {
        return res.status(400).json({ message: 'Title, description, category, and due date are required.' });
      }

      const task = new Task({
        title,
        description,
        creator: req.user?._id,
        assignees: assignees || [],
        teams: teams || [],
        priority: priority || 'medium',
        status: 'pending',
        category,
        labels: labels || [],
        colorTag,
        dueDate,
        reminderDate,
        estimatedTime: estimatedTime || 0,
        dependencies: dependencies || [],
        subtasks: subtasks || [],
        approvalRequired: approvalRequired || false,
        customFields: customFields || {},
        history: [
          {
            status: 'pending',
            notes: 'Task created.',
            updatedBy: req.user?._id,
          },
        ],
      });

      await task.save();

      // Create a related Chat Group for Task Discussion
      const chatGroup = new Group({
        name: `Discussion: ${task.title}`,
        type: 'task_discussion',
        taskId: task._id,
        members: [...(assignees || []), req.user?._id],
      });
      await chatGroup.save();

      // Send Push Notifications
      if (assignees && assignees.length > 0) {
        await addNotificationJob(
          assignees,
          'New Task Assigned',
          `You have been assigned: "${task.title}" by ${req.user?.username}.`,
          { taskId: task._id.toString(), type: 'TASK_ASSIGNED' }
        );
      }

      // Sockets Real-time Update
      const io = req.app.get('io');
      if (io) {
        io.emit('task_created', task);
      }

      // Audit Log
      await AuditLog.create({
        actorId: req.user?._id,
        action: 'TASK_CREATE',
        details: `Created task "${task.title}" assigned to ${assignees?.length || 0} users.`,
        ipAddress: req.ip || '127.0.0.1',
      });

      return res.status(201).json(task);
    } catch (error: any) {
      console.error('Create task error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.' });
    }
  }

  // Get Tasks (Filters & Search)
  public static async getTasks(req: IRequestWithUser, res: Response) {
    try {
      const { search, priority, status, category, assignee, creator, overdue } = req.query;
      const filter: any = {};

      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }

      if (priority) filter.priority = priority;
      if (status) filter.status = status;
      if (category) filter.category = category;

      const isAdmin = ['super_admin', 'principal'].includes(req.user?.role || '');

      if (!isAdmin) {
        // Enforce data isolation: normal users can only see tasks they created or are assigned to
        filter.$or = [
          ...(filter.$or || []),
          { assignees: req.user._id },
          { creator: req.user._id },
        ];
      } else {
        if (assignee && assignee !== 'undefined') filter.assignees = assignee;
        if (creator && creator !== 'undefined') filter.creator = creator;
      }

      // Filter for overdue tasks
      if (overdue === 'true') {
        filter.dueDate = { $lt: new Date() };
        filter.status = { $ne: 'completed' };
      }

      const tasks = await Task.find(filter)
        .populate('creator', 'username role')
        .populate('assignees', 'username role department employeeId')
        .populate('dependencies', 'title status dueDate')
        .populate('comments.user', 'username role')
        .sort({ dueDate: 1 });

      return res.status(200).json(tasks);
    } catch (error: any) {
      console.error('Get tasks error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.'  });
    }
  }

  // Fetch Single Task
  public static async getTaskById(req: IRequestWithUser, res: Response) {
    try {
      const { id } = req.params;
      const task = await Task.findById(id)
        .populate('creator', 'username role')
        .populate('assignees', 'username role department employeeId')
        .populate('dependencies', 'title status dueDate')
        .populate({
          path: 'history.updatedBy',
          select: 'username role',
        })
        .populate({
          path: 'comments.user',
          select: 'username role',
        });

      if (!task) {
        return res.status(404).json({ message: 'Task not found.' });
      }

      const chatGroup = await Group.findOne({ taskId: task._id });
      const taskObj = task.toObject();
      (taskObj as any).chatGroupId = chatGroup ? chatGroup._id : null;

      return res.status(200).json(taskObj);
    } catch (error: any) {
      console.error('Get task details error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.'  });
    }
  }

  // Update Task Details
  public static async updateTask(req: IRequestWithUser, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const task = await Task.findById(id);
      if (!task) {
        return res.status(404).json({ message: 'Task not found.' });
      }

      // Add a history item for editing
      if (updates.status && updates.status !== task.status) {
        task.history.push({
          status: updates.status,
          notes: updates.notes || 'Status updated.',
          updatedBy: req.user._id,
          updatedAt: new Date(),
        });
      }

      Object.assign(task, updates);
      await task.save();

      // Sync members in discussion group
      if (updates.assignees) {
        await Group.findOneAndUpdate(
          { taskId: task._id },
          { $addToSet: { members: { $each: [...updates.assignees, task.creator] } } }
        );
      }

      // Socket Emit
      const io = req.app.get('io');
      if (io) {
        io.emit('task_updated', task);
      }

      // Audit Log
      await AuditLog.create({
        actorId: req.user._id,
        action: 'TASK_UPDATE',
        details: `Updated task "${task.title}".`,
        ipAddress: req.ip || '127.0.0.1',
      });

      return res.status(200).json(task);
    } catch (error: any) {
      console.error('Update task error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.' });
    }
  }

  // Delete Task
  public static async deleteTask(req: IRequestWithUser, res: Response) {
    try {
      const { id } = req.params;
      const task = await Task.findById(id);

      if (!task) {
        return res.status(404).json({ message: 'Task not found.' });
      }

      await Task.findByIdAndDelete(id);
      // Clean up chat group
      await Group.findOneAndDelete({ taskId: id });

      // Socket Emit
      const io = req.app.get('io');
      if (io) {
        io.emit('task_deleted', id);
      }

      // Audit Log
      await AuditLog.create({
        actorId: req.user._id,
        action: 'TASK_DELETE',
        details: `Deleted task "${task.title}".`,
        ipAddress: req.ip || '127.0.0.1',
      });

      return res.status(200).json({ message: 'Task deleted successfully.' });
    } catch (error: any) {
      console.error('Delete task error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.'  });
    }
  }

  // Toggle Subtask Checklist
  public static async toggleSubtask(req: IRequestWithUser, res: Response) {
    try {
      const { taskId, subtaskId } = req.params;
      const { isCompleted } = req.body;

      const task = await Task.findById(taskId);
      if (!task) {
        return res.status(404).json({ message: 'Task not found.' });
      }

      const subtask = task.subtasks.find((s: any) => s._id.toString() === subtaskId);
      if (!subtask) {
        return res.status(404).json({ message: 'Subtask not found.' });
      }

      subtask.isCompleted = isCompleted;
      await task.save();

      // Socket Emit
      const io = req.app.get('io');
      if (io) {
        io.emit('task_updated', task);
      }

      return res.status(200).json(task);
    } catch (error: any) {
      console.error('Toggle subtask error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.'  });
    }
  }

  // Update Status & Handle Attachments (Uploads)
  public static async updateStatus(req: IRequestWithUser, res: Response) {
    try {
      const { id } = req.params;
      const { status, notes, actualTime } = req.body;

      const task = await Task.findById(id);
      if (!task) {
        return res.status(404).json({ message: 'Task not found.' });
      }

      // Handle attachments if files were uploaded via Multer
      const files = req.files as Express.Multer.File[];
      const newAttachments = [];

      if (files && files.length > 0) {
        for (const file of files) {
          // Cloudinary url or local path (we store local path in this case, serving static)
          // In production this maps to Cloudinary url, we mock upload relative URL
          newAttachments.push({
            url: `/uploads/${file.filename}`,
            filename: file.originalname,
            fileType: file.mimetype,
            uploadedAt: new Date(),
          });
        }
      }

      if (newAttachments.length > 0) {
        task.attachments.push(...newAttachments);
      }

      // Check if approval is required
      let targetStatus = status;
      if (status === 'completed' && task.approvalRequired) {
        targetStatus = 'needs_review';
        task.approvalStatus = 'pending';
      }

      task.status = targetStatus;
      if (actualTime) task.actualTime = actualTime;

      task.history.push({
        status: targetStatus,
        notes: notes || `Task updated to ${targetStatus}`,
        updatedBy: req.user._id,
        updatedAt: new Date(),
      });

      await task.save();

      // Socket Emit
      const io = req.app.get('io');
      if (io) {
        io.emit('task_updated', task);
      }

      // Notify the Task Creator if task was completed or needs review
      if (targetStatus === 'needs_review' || targetStatus === 'completed') {
        await addNotificationJob(
          [task.creator.toString()],
          'Task Status Update',
          `Task "${task.title}" was updated to ${targetStatus} by ${req.user?.username}.`,
          { taskId: task._id.toString(), type: 'TASK_STATUS_UPDATE' }
        );
      }

      return res.status(200).json(task);
    } catch (error: any) {
      console.error('Update status error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.' });
    }
  }

  // Approve completed tasks (Creator / Admin only)
  public static async approveTask(req: IRequestWithUser, res: Response) {
    try {
      const { id } = req.params;
      const { approve, notes } = req.body; // approve: true | false

      const task = await Task.findById(id);
      if (!task) {
        return res.status(404).json({ message: 'Task not found.' });
      }

      const isCreator = task.creator.toString() === req.user._id.toString();
      const isAdmin = ['super_admin', 'principal'].includes(req.user?.role || '');

      if (!isCreator && !isAdmin) {
        return res.status(403).json({ message: 'You are not authorized to approve this task.' });
      }

      if (approve) {
        task.status = 'completed';
        task.approvalStatus = 'approved';
      } else {
        task.status = 'in_progress';
        task.approvalStatus = 'rejected';
      }

      task.history.push({
        status: task.status,
        notes: notes || (approve ? 'Task approved.' : 'Task rejected. Sent back for review.'),
        updatedBy: req.user._id,
        updatedAt: new Date(),
      });

      await task.save();

      // Push notification to assignees
      await addNotificationJob(
        task.assignees.map((a) => a.toString()),
        approve ? 'Task Approved' : 'Task Revision Requested',
        approve
          ? `Your work on "${task.title}" was approved by ${req.user?.username}.`
          : `Revision requested on "${task.title}" by ${req.user?.username}.`,
        { taskId: task._id.toString(), type: approve ? 'TASK_APPROVED' : 'TASK_REVISION' }
      );

      // Socket Emit
      const io = req.app.get('io');
      if (io) {
        io.emit('task_updated', task);
      }

      return res.status(200).json(task);
    } catch (error: any) {
      console.error('Approve task error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.'  });
    }
  }
  public static async addComment(req: IRequestWithUser, res: Response) {
    try {
      const { id } = req.params;
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ message: 'Comment text is required.' });
      }

      const task = await Task.findById(id);
      if (!task) {
        return res.status(404).json({ message: 'Task not found.' });
      }

      // Allow if admin, creator, or assignee
      const isCreator = task.creator.toString() === req.user._id.toString();
      const isAssignee = task.assignees.some((a) => a.toString() === req.user._id.toString());
      const isAdmin = ['super_admin', 'principal'].includes(req.user?.role || '');

      if (!isCreator && !isAssignee && !isAdmin) {
        return res.status(403).json({ message: 'You are not authorized to comment on this task.' });
      }

      task.comments.push({
        user: req.user._id,
        text,
        createdAt: new Date(),
      });

      await task.save();

      // Notify users related to this task
      const notifyList = new Set([
        task.creator.toString(),
        ...task.assignees.map((a) => a.toString()),
      ]);
      notifyList.delete(req.user._id.toString()); // don't notify the person who commented

      if (notifyList.size > 0) {
        await addNotificationJob(
          Array.from(notifyList),
          'New Task Comment',
          `${req.user?.username} commented on "${task.title}": "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
          { taskId: task._id.toString(), type: 'TASK_COMMENT' }
        );
      }

      // Socket Emit
      const io = req.app.get('io');
      if (io) {
        io.emit('task_updated', task);
      }

      // return populated comment list
      const populatedTask = await Task.findById(id).populate({
        path: 'comments.user',
        select: 'username role',
      });

      return res.status(200).json(populatedTask?.comments || []);
    } catch (error: any) {
      console.error('Add task comment error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.'  });
    }
  }
}
export default TaskController;
