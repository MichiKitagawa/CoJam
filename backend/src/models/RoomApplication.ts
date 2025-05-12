import mongoose, { Document, Schema } from 'mongoose';

export interface IRoomApplication extends Document {
  roomId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId; // 申請者
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  respondedAt?: Date;
}

const RoomApplicationSchema = new Schema<IRoomApplication>(
  {
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      required: true,
    },
    // requestedAt: { type: Date, default: Date.now }, // timestamps createdAtで代用
    // respondedAt: { type: Date }, // timestamps updatedAtで代用
  },
  { timestamps: { createdAt: 'requestedAt', updatedAt: 'respondedAt' } } 
);

export default mongoose.model<IRoomApplication>('RoomApplication', RoomApplicationSchema); 