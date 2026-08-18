import mongoose, { Schema, Document } from 'mongoose';

export interface IGoal extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  category: string;
  color: string;
  targetDate?: Date;
  status: 'not_started' | 'in_progress' | 'completed' | 'abandoned';
  progress: number; // 0-100 percentage
  linkedTasks: mongoose.Types.ObjectId[];
  linkedHabits: mongoose.Types.ObjectId[];
  milestones: { title: string; isCompleted: boolean; completedAt?: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

const goalSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    category: { type: String, default: 'General' },
    color: { type: String, default: '#3b82f6' },
    targetDate: { type: Date },
    status: { 
      type: String, 
      enum: ['not_started', 'in_progress', 'completed', 'abandoned'], 
      default: 'not_started' 
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    linkedTasks: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    linkedHabits: [{ type: Schema.Types.ObjectId, ref: 'Habit' }],
    milestones: [
      {
        title: { type: String, required: true },
        isCompleted: { type: Boolean, default: false },
        completedAt: { type: Date }
      }
    ]
  },
  { timestamps: true }
);

export const Goal = mongoose.model<IGoal>('Goal', goalSchema);
