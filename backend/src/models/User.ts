import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  employeeId: string; // Or studentId
  username: string;
  passwordHash: string;
  role: 'super_admin' | 'principal' | 'teacher' | 'coordinator' | 'staff' | 'student' | 'PGT' | 'TGT' | 'PRT' | 'NT' | 'MTS';
  department: string;
  permissions: string[];
  status: 'active' | 'suspended';
  assignedClass?: string;
  assignedTeam?: string;
  manager?: Schema.Types.ObjectId;
  biometricPublicKey?: string;
  fcmTokens: string[];
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    employeeId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ['super_admin', 'principal', 'teacher', 'coordinator', 'staff', 'student', 'PGT', 'TGT', 'PRT', 'NT', 'MTS'],
    },
    department: { type: String, required: true },
    permissions: [{ type: String }],
    status: { type: String, required: true, enum: ['active', 'suspended'], default: 'active' },
    assignedClass: { type: String },
    assignedTeam: { type: String },
    manager: { type: Schema.Types.ObjectId, ref: 'User' },
    biometricPublicKey: { type: String },
    fcmTokens: [{ type: String }],
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password helper
UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.passwordHash);
};

export const User = model<IUser>('User', UserSchema);
export default User;
