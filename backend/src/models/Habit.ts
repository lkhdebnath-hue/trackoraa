import mongoose, { Schema, Document } from 'mongoose';

export interface IHabit extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  customDays?: number[]; // 0-6 for Sun-Sat
  category: string;
  color: string;
  icon?: string;
  status: 'active' | 'paused' | 'archived';
  reminderTime?: string; // HH:mm format
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  createdAt: Date;
  updatedAt: Date;
}

const habitSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    frequency: { 
      type: String, 
      enum: ['daily', 'weekly', 'monthly', 'custom'], 
      default: 'daily' 
    },
    customDays: [{ type: Number, min: 0, max: 6 }],
    category: { type: String, default: 'General' },
    color: { type: String, default: '#6366f1' },
    icon: { type: String, default: 'check' },
    status: { 
      type: String, 
      enum: ['active', 'paused', 'archived'], 
      default: 'active',
      index: true
    },
    reminderTime: { type: String },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    totalCompletions: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Habit = mongoose.model<IHabit>('Habit', habitSchema);
