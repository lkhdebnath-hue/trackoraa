import mongoose, { Schema, Document } from 'mongoose';

export interface IHabitLog extends Document {
  habit: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  status: 'completed' | 'skipped' | 'missed';
  notes?: string;
  createdAt: Date;
}

const habitLogSchema = new Schema(
  {
    habit: { type: Schema.Types.ObjectId, ref: 'Habit', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['completed', 'skipped', 'missed'], 
      required: true 
    },
    notes: { type: String },
  },
  { timestamps: true }
);

// Prevent duplicate logs for the same day
habitLogSchema.index({ habit: 1, date: 1 }, { unique: true });

export const HabitLog = mongoose.model<IHabitLog>('HabitLog', habitLogSchema);
