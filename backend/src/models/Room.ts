import mongoose, { Document, Schema } from 'mongoose';

export interface IRoom extends Document {
  title: string;
  description?: string;
  hostUserId: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
  isPaid: boolean;
  price?: number;
  maxParticipants: number;
  isArchiveEnabled: boolean;
  status: 'scheduled' | 'live' | 'ended';
  scheduledStartAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  recordingUrl?: string;
  joinToken: string;
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    hostUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isPaid: { type: Boolean, default: false },
    price: { type: Number, min: 0 },
    maxParticipants: { type: Number, default: 4, min: 2, max: 10 },
    isArchiveEnabled: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['scheduled', 'live', 'ended'],
      default: 'scheduled',
    },
    scheduledStartAt: { type: Date },
    startedAt: { type: Date },
    endedAt: { type: Date },
    recordingUrl: { type: String },
    joinToken: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IRoom>('Room', RoomSchema); 