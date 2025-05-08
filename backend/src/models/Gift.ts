import mongoose, { Document, Schema } from 'mongoose';

export interface IGift extends Document {
  roomId: mongoose.Types.ObjectId;
  fromUserId: mongoose.Types.ObjectId;
  toUserId: mongoose.Types.ObjectId;
  amount: number;
  message?: string;
  status: 'pending' | 'completed' | 'refunded';
  paymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GiftSchema = new Schema<IGift>(
  {
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 1 },
    message: { type: String, maxlength: 200 },
    status: {
      type: String,
      enum: ['pending', 'completed', 'refunded'],
      default: 'pending',
    },
    paymentId: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IGift>('Gift', GiftSchema); 