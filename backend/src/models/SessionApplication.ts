import mongoose, { Document, Schema } from 'mongoose';

export interface ISessionApplication extends Document {
  sessionId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId; // 申請者
  status: 'pending' | 'approved' | 'rejected' | 'canceled';
  requestedAt: Date;
  respondedAt?: Date;
}

const SessionApplicationSchema = new Schema<ISessionApplication>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'canceled'],
      default: 'pending',
      required: true,
    },
    // requestedAt: { type: Date, default: Date.now }, // timestamps createdAtで代用
    // respondedAt: { type: Date }, // timestamps updatedAtで代用
  },
  { timestamps: { createdAt: 'requestedAt', updatedAt: 'respondedAt' } } 
);

export default mongoose.model<ISessionApplication>('SessionApplication', SessionApplicationSchema); 