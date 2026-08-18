import { Schema, model, Document } from 'mongoose';

export interface IAuditLog extends Document {
  actorId: Schema.Types.ObjectId;
  action: string;
  details: string;
  ipAddress: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true, index: true },
    details: { type: String, required: true },
    ipAddress: { type: String, required: true },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export const AuditLog = model<IAuditLog>('AuditLog', AuditLogSchema);
export default AuditLog;
