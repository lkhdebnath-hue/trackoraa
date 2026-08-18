import { Schema, model, Document } from 'mongoose';

export interface IGroup extends Document {
  name?: string; // Optional for 1-to-1
  type: 'direct' | 'group' | 'task_discussion';
  taskId?: Schema.Types.ObjectId; // If type is task_discussion
  members: Schema.Types.ObjectId[];
  pinnedMessages: Schema.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema = new Schema<IGroup>(
  {
    name: { type: String },
    type: { type: String, required: true, enum: ['direct', 'group', 'task_discussion'] },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', index: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }],
    pinnedMessages: [{ type: Schema.Types.ObjectId, ref: 'Message' }],
  },
  { timestamps: true }
);

export interface IMessageAttachment {
  url: string;
  filename: string;
  fileType: string;
}

export interface IReadReceipt {
  userId: Schema.Types.ObjectId;
  readAt: Date;
}

export interface IMessage extends Document {
  groupId: Schema.Types.ObjectId;
  senderId: Schema.Types.ObjectId;
  content: string;
  attachments: IMessageAttachment[];
  readBy: IReadReceipt[];
  replyTo?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, default: '' },
    attachments: [
      {
        url: { type: String, required: true },
        filename: { type: String, required: true },
        fileType: { type: String, required: true },
      },
    ],
    readBy: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        readAt: { type: Date, default: Date.now },
      },
    ],
    replyTo: { type: Schema.Types.ObjectId, ref: 'Message' },
  },
  { timestamps: true }
);

export const Group = model<IGroup>('Group', GroupSchema);
export const Message = model<IMessage>('Message', MessageSchema);
