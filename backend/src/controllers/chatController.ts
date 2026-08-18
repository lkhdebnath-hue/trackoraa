import { Response } from 'express';
import { Group, Message } from '../models/Chat';
import { User } from '../models/User';
import { IRequestWithUser } from '../middleware/auth';
import { addNotificationJob } from '../services/queueService';
import AuditLog from '../models/AuditLog';

export class ChatController {
  // Get Groups of the Logged-In User
  public static async getGroups(req: IRequestWithUser, res: Response) {
    try {
      const userId = req.user?._id;
      const groups = await Group.find({ members: userId })
        .populate('members', 'username role employeeId department status')
        .populate('taskId', 'title status dueDate')
        .sort({ updatedAt: -1 });

      return res.status(200).json(groups);
    } catch (error: any) {
      console.error('Get groups error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.'  });
    }
  }

  // Get Messages of a Group (with pagination)
  public static async getMessages(req: IRequestWithUser, res: Response) {
    try {
      const { groupId } = req.params;
      const { limit = 50, before } = req.query;

      // Verify membership
      const group = await Group.findOne({ _id: groupId, members: req.user?._id });
      if (!group) {
        return res.status(403).json({ message: 'You are not a member of this chat group.' });
      }

      const query: any = { groupId };
      if (before) {
        query.createdAt = { $lt: new Date(before as string) };
      }

      const messages = await Message.find(query)
        .populate('senderId', 'username role')
        .populate({
          path: 'replyTo',
          select: 'content senderId',
          populate: { path: 'senderId', select: 'username' },
        })
        .sort({ createdAt: -1 })
        .limit(Number(limit));

      // Reverse messages to return in chronological order
      return res.status(200).json(messages.reverse());
    } catch (error: any) {
      console.error('Get messages error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.'  });
    }
  }

  // Create Group / Start 1-to-1 Chat
  public static async createGroup(req: IRequestWithUser, res: Response) {
    try {
      const { name, type, members, taskId } = req.body; // type: 'direct' | 'group' | 'task_discussion'
      const userId = req.user?._id;

      if (!type || !members || !Array.isArray(members) || members.length === 0) {
        return res.status(400).json({ message: 'Type and member IDs are required.' });
      }

      const allMembers = Array.from(new Set([...members, userId?.toString()]));

      if (type === 'direct') {
        if (allMembers.length !== 2) {
          return res.status(400).json({ message: 'Direct chat must have exactly 2 members.' });
        }
        const existingGroup = await Group.findOne({
          type: 'direct',
          members: { $all: allMembers, $size: 2 },
        }).populate('members', 'username role employeeId department');

        if (existingGroup) {
          return res.status(200).json(existingGroup);
        }
      }

      const group = new Group({
        name: type === 'group' ? name || 'New Group' : undefined,
        type,
        taskId: taskId || undefined,
        members: allMembers,
      });

      await group.save();

      // Audit Log for collaboration
      await AuditLog.create({
        actorId: userId,
        action: 'COLLABORATION_CREATE',
        details: `Created ${type} workspace: "${name || 'Discussion'}" with ${allMembers.length} members.`,
        ipAddress: req.ip || '127.0.0.1',
      });

      const populated = await Group.findById(group._id).populate('members', 'username role employeeId department');

      return res.status(201).json(populated);
    } catch (error: any) {
      console.error('Create group error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.'  });
    }
  }

  // Send Message (REST endpoint)
  public static async sendMessage(req: IRequestWithUser, res: Response) {
    try {
      const { groupId } = req.params;
      const { content, replyTo } = req.body;
      const senderId = req.user?._id;

      // Verify membership
      const group = await Group.findOne({ _id: groupId, members: senderId });
      if (!group) {
        return res.status(403).json({ message: 'You are not a member of this chat group.' });
      }

      const files = req.files as Express.Multer.File[];
      const attachments = [];

      if (files && files.length > 0) {
        for (const file of files) {
          attachments.push({
            url: `/uploads/${file.filename}`,
            filename: file.originalname,
            fileType: file.mimetype,
          });
        }
      }

      if (!content && attachments.length === 0) {
        return res.status(400).json({ message: 'Message content or attachment is required.' });
      }

      const message = new Message({
        groupId,
        senderId,
        content: content || '',
        attachments,
        readBy: [{ userId: senderId, readAt: new Date() }],
        replyTo: replyTo || undefined,
      });

      await message.save();

      // Update Group's updatedAt trigger
      group.updatedAt = new Date();
      await group.save();

      // Audit logs for messages and files
      await AuditLog.create({
        actorId: senderId,
        action: 'MESSAGE_SEND',
        details: `Sent message in group ${groupId}. Content: "${content?.substring(0, 30) || 'Attachment'}"`,
        ipAddress: req.ip || '127.0.0.1',
      });

      if (attachments.length > 0) {
        await AuditLog.create({
          actorId: senderId,
          action: 'FILE_UPLOAD',
          details: `Uploaded ${attachments.length} files in group ${groupId}.`,
          ipAddress: req.ip || '127.0.0.1',
        });
      }

      const populatedMessage = await Message.findById(message._id)
        .populate('senderId', 'username role')
        .populate({
          path: 'replyTo',
          select: 'content senderId',
          populate: { path: 'senderId', select: 'username' },
        });

      // Socket Emit
      const io = req.app.get('io');
      if (io) {
        io.to(groupId).emit('new_message', populatedMessage);
      }

      // Notify offline members
      const offlineMembers = group.members.filter((m) => m.toString() !== senderId?.toString());
      if (offlineMembers.length > 0) {
        await addNotificationJob(
          offlineMembers.map((m) => m.toString()),
          group.name || `Chat with ${req.user?.username}`,
          content || 'Sent an attachment',
          { groupId: group._id.toString(), type: 'CHAT_MESSAGE' }
        );
      }

      return res.status(201).json(populatedMessage);
    } catch (error: any) {
      console.error('Send message error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.'  });
    }
  }

  // Search Messages
  public static async searchMessages(req: IRequestWithUser, res: Response) {
    try {
      const { groupId } = req.params;
      const { q } = req.query;

      if (!q) {
        return res.status(400).json({ message: 'Search query is required.' });
      }

      const group = await Group.findOne({ _id: groupId, members: req.user?._id });
      if (!group) {
        return res.status(403).json({ message: 'You are not a member of this chat group.' });
      }

      const messages = await Message.find({
        groupId,
        content: { $regex: q as string, $options: 'i' },
      })
        .populate('senderId', 'username role')
        .populate({
          path: 'replyTo',
          select: 'content senderId',
          populate: { path: 'senderId', select: 'username' },
        })
        .sort({ createdAt: -1 });

      return res.status(200).json(messages.reverse());
    } catch (error: any) {
      console.error('Search messages error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.'  });
    }
  }

  // Pin Message
  public static async pinMessage(req: IRequestWithUser, res: Response) {
    try {
      const { groupId, messageId } = req.params;

      const group = await Group.findOne({ _id: groupId, members: req.user?._id });
      if (!group) {
        return res.status(403).json({ message: 'Access denied.' });
      }

      const message = await Message.findById(messageId);
      if (!message || message.groupId.toString() !== groupId) {
        return res.status(404).json({ message: 'Message not found in this group.' });
      }

      if (!group.pinnedMessages.includes(messageId as any)) {
        group.pinnedMessages.push(messageId as any);
        await group.save();
      }

      // Audit Log
      await AuditLog.create({
        actorId: req.user?._id,
        action: 'MESSAGE_PIN',
        details: `Pinned a message in group ${groupId}`,
        ipAddress: req.ip || '127.0.0.1',
      });

      // Socket Emit
      const io = req.app.get('io');
      if (io) {
        io.to(groupId).emit('message_pinned', { messageId, groupId });
      }

      return res.status(200).json({ message: 'Message pinned successfully.' });
    } catch (error: any) {
      console.error('Pin message error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.'  });
    }
  }

  // Unpin Message
  public static async unpinMessage(req: IRequestWithUser, res: Response) {
    try {
      const { groupId, messageId } = req.params;

      const group = await Group.findOne({ _id: groupId, members: req.user?._id });
      if (!group) {
        return res.status(403).json({ message: 'Access denied.' });
      }

      group.pinnedMessages = group.pinnedMessages.filter((id) => id.toString() !== messageId);
      await group.save();

      // Socket Emit
      const io = req.app.get('io');
      if (io) {
        io.to(groupId).emit('message_unpinned', { messageId, groupId });
      }

      return res.status(200).json({ message: 'Message unpinned successfully.' });
    } catch (error: any) {
      console.error('Unpin message error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.'  });
    }
  }

  // Get Pinned Messages
  public static async getPinnedMessages(req: IRequestWithUser, res: Response) {
    try {
      const { groupId } = req.params;

      const group = await Group.findOne({ _id: groupId, members: req.user?._id }).populate({
        path: 'pinnedMessages',
        populate: { path: 'senderId', select: 'username role' },
      });

      if (!group) {
        return res.status(403).json({ message: 'Access denied.' });
      }

      return res.status(200).json(group.pinnedMessages);
    } catch (error: any) {
      console.error('Get pinned messages error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.'  });
    }
  }

  // Mark Messages as Read
  public static async markRead(req: IRequestWithUser, res: Response) {
    try {
      const { groupId } = req.params;
      const userId = req.user?._id;

      const group = await Group.findOne({ _id: groupId, members: userId });
      if (!group) {
        return res.status(403).json({ message: 'Access denied.' });
      }

      await Message.updateMany(
        { groupId, 'readBy.userId': { $ne: userId } },
        { $push: { readBy: { userId, readAt: new Date() } } }
      );

      // Socket Emit
      const io = req.app.get('io');
      if (io) {
        io.to(groupId).emit('read_receipt', { groupId, userId, readAt: new Date() });
      }

      return res.status(200).json({ message: 'Messages marked as read.' });
    } catch (error: any) {
      console.error('Mark read error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.'  });
    }
  }
}
export default ChatController;
