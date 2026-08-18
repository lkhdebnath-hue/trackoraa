import { Schema, model, Document } from 'mongoose';

export interface IAttachment {
  url: string;
  filename: string;
  fileType: string;
  uploadedAt: Date;
}

export interface ISubtask {
  title: string;
  isCompleted: boolean;
}

export interface ITaskHistory {
  status: string;
  notes?: string;
  updatedBy: Schema.Types.ObjectId;
  updatedAt: Date;
}

export interface ITaskComment {
  user: Schema.Types.ObjectId;
  text: string;
  createdAt: Date;
}

export interface ITask extends Document {
  title: string;
  description: string;
  creator: Schema.Types.ObjectId;
  assignees: Schema.Types.ObjectId[];
  teams: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'accepted' | 'in_progress' | 'paused' | 'waiting' | 'completed' | 'rejected' | 'cancelled' | 'needs_review';
  category: string;
  labels: string[];
  colorTag?: string;
  attachments: IAttachment[];
  dueDate: Date;
  reminderDate?: Date;
  estimatedTime: number; // in minutes
  actualTime?: number; // in minutes
  dependencies: Schema.Types.ObjectId[];
  subtasks: ISubtask[];
  approvalRequired: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  customFields?: Map<string, string>;
  history: ITaskHistory[];
  comments: ITaskComment[];
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    creator: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignees: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    teams: [{ type: String }],
    priority: { type: String, required: true, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'accepted', 'in_progress', 'paused', 'waiting', 'completed', 'rejected', 'cancelled', 'needs_review'],
      default: 'pending',
    },
    category: { type: String, required: true },
    labels: [{ type: String }],
    colorTag: { type: String },
    attachments: [
      {
        url: { type: String, required: true },
        filename: { type: String, required: true },
        fileType: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    dueDate: { type: Date, required: true, index: true },
    reminderDate: { type: Date },
    estimatedTime: { type: Number, required: true, default: 0 },
    actualTime: { type: Number },
    dependencies: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    subtasks: [
      {
        title: { type: String, required: true },
        isCompleted: { type: Boolean, required: true, default: false },
      },
    ],
    approvalRequired: { type: Boolean, required: true, default: false },
    approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'] },
    customFields: { type: Map, of: String },
    history: [
      {
        status: { type: String, required: true },
        notes: { type: String },
        updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    comments: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export const Task = model<ITask>('Task', TaskSchema);
export default Task;
