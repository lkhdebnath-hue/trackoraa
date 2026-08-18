import mongoose, { Schema, Document } from 'mongoose';
import { encrypt, decrypt } from '../utils/crypto';

export interface ILiveLocation extends Document {
  userId: mongoose.Types.ObjectId;
  taskId?: mongoose.Types.ObjectId;
  latitude: string; // encrypted
  longitude: string; // encrypted
  accuracy: number;
  status: 'Travelling' | 'On Site' | 'Working' | 'Completed' | 'Offline';
  sharingType: 'once' | '15mins' | '30mins' | 'until_complete' | 'task_continuous';
  expiresAt?: Date;
  updatedAt: Date;
  getCoords(): { latitude: number; longitude: number };
  setCoords(lat: number, lon: number): void;
}

const LiveLocationSchema = new Schema<ILiveLocation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', index: true },
    latitude: { type: String, required: true },
    longitude: { type: String, required: true },
    accuracy: { type: Number, required: true },
    status: {
      type: String,
      required: true,
      enum: ['Travelling', 'On Site', 'Working', 'Completed', 'Offline'],
      default: 'Travelling',
    },
    sharingType: {
      type: String,
      required: true,
      enum: ['once', '15mins', '30mins', 'until_complete', 'task_continuous'],
    },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

LiveLocationSchema.methods.getCoords = function () {
  return {
    latitude: parseFloat(decrypt(this.latitude)),
    longitude: parseFloat(decrypt(this.longitude)),
  };
};

LiveLocationSchema.methods.setCoords = function (lat: number, lon: number) {
  this.latitude = encrypt(lat.toString());
  this.longitude = encrypt(lon.toString());
};

export const LiveLocation = mongoose.model<ILiveLocation>('LiveLocation', LiveLocationSchema);
export default LiveLocation;
