import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface UserActiveSessionRole {
  roomId: mongoose.Types.ObjectId;
  role: 'host' | 'performer' | 'viewer';
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  profileImage?: string;
  bio?: string;
  activeSessionId?: mongoose.Types.ObjectId | null;
  activeSessionRole?: 'host' | 'performer' | 'viewer' | null;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    profileImage: { type: String },
    bio: { type: String, maxlength: 500 },
    activeSessionId: { type: Schema.Types.ObjectId, ref: 'Session', default: null },
    activeSessionRole: { type: String, enum: ['host', 'performer', 'viewer', null], default: null },
  },
  { timestamps: true }
);

// パスワードのハッシュ化
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// パスワード検証メソッド
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>('User', UserSchema); 