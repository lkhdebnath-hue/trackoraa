import mongoose, { Schema, Document } from 'mongoose';
import { encrypt, decrypt } from '../utils/crypto';

export interface IRoutePoint {
  latitude: string; // encrypted
  longitude: string; // encrypted
  timestamp: Date;
}

export interface ILocationHistory extends Document {
  userId: mongoose.Types.ObjectId;
  taskId: mongoose.Types.ObjectId;
  startLocation: { latitude: string; longitude: string }; // encrypted
  endLocation?: { latitude: string; longitude: string }; // encrypted
  route: IRoutePoint[];
  duration: number; // in minutes
  distance?: number; // in meters
  createdAt: Date;
  getRoutePoints(): Array<{ latitude: number; longitude: number; timestamp: Date }>;
  addRoutePoint(lat: number, lon: number): void;
}

const LocationHistorySchema = new Schema<ILocationHistory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    startLocation: {
      latitude: { type: String, required: true },
      longitude: { type: String, required: true },
    },
    endLocation: {
      latitude: { type: String },
      longitude: { type: String },
    },
    route: [
      {
        latitude: { type: String, required: true },
        longitude: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    duration: { type: Number, default: 0 },
    distance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

LocationHistorySchema.methods.getRoutePoints = function () {
  return this.route.map((p: any) => ({
    latitude: parseFloat(decrypt(p.latitude)),
    longitude: parseFloat(decrypt(p.longitude)),
    timestamp: p.timestamp,
  }));
};

LocationHistorySchema.methods.addRoutePoint = function (lat: number, lon: number) {
  this.route.push({
    latitude: encrypt(lat.toString()),
    longitude: encrypt(lon.toString()),
    timestamp: new Date(),
  });
};

export const LocationHistory = mongoose.model<ILocationHistory>('LocationHistory', LocationHistorySchema);
export default LocationHistory;
