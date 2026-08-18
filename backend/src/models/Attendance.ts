import { Schema, model, Document } from 'mongoose';

export interface IGpsCoords {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface ILocationHistory {
  latitude: number;
  longitude: number;
  timestamp: Date;
}

export interface IAttendance extends Document {
  userId: Schema.Types.ObjectId;
  date: string; // YYYY-MM-DD
  clockIn: Date;
  clockOut?: Date;
  gpsClockIn: IGpsCoords;
  gpsClockOut?: IGpsCoords;
  status: 'present' | 'late' | 'half_day' | 'absent';
  locationHistory: ILocationHistory[];
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true, index: true }, // Format YYYY-MM-DD
    clockIn: { type: Date, required: true },
    clockOut: { type: Date },
    gpsClockIn: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      address: { type: String },
    },
    gpsClockOut: {
      latitude: { type: Number },
      longitude: { type: Number },
      address: { type: String },
    },
    status: {
      type: String,
      required: true,
      enum: ['present', 'late', 'half_day', 'absent'],
      default: 'present',
    },
    locationHistory: [
      {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Prevent double clock-ins on same day
AttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

export const Attendance = model<IAttendance>('Attendance', AttendanceSchema);
export default Attendance;
