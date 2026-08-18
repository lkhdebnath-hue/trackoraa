import mongoose, { Schema, Document } from 'mongoose';

export interface IAnnouncement extends Document {
  title: string;
  content: string;
  authorId: mongoose.Types.ObjectId;
  targetRoles: string[];
  createdAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>({
  title: { type: String, required: true },
  content: { type: String, required: true },
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetRoles: { type: [String], default: ['all'] },
  createdAt: { type: Date, default: Date.now },
});

export const Announcement = mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema);
export default Announcement;
