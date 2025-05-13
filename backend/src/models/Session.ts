import mongoose, { Document, Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// ★ インターフェース名を変更: IRoom -> ISession
export interface ISession extends Document { 
  title: string;
  description?: string;
  hostUserId: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[]; // ★ Viewer を含むか、演者のみか再確認
  isPaid: boolean;
  price?: number;
  maxParticipants: number; // ★ 演者の上限数か、総参加者数の上限か再確認
  isArchiveEnabled: boolean;
  status: 'scheduled' | 'ready' | 'live' | 'ended';
  scheduledStartAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  recordingUrl?: string;
  joinToken: string;
  createdAt: Date;
  updatedAt: Date;
}

// ★ スキーマ変数名を変更: RoomSchema -> SessionSchema
const SessionSchema = new Schema<ISession>( 
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
      enum: ['scheduled', 'ready', 'live', 'ended'],
      default: 'scheduled',
    },
    scheduledStartAt: { type: Date },
    startedAt: { type: Date },
    endedAt: { type: Date },
    recordingUrl: { type: String },
    // ★ joinToken は必須か？招待制でないセッションもある？
    joinToken: { type: String, required: true }, 
  },
  { timestamps: true }
);

// ★ スキーマ変数名を変更: RoomSchema -> SessionSchema
SessionSchema.pre('save', function(next) { 
  if (!this.joinToken) {
    this.joinToken = uuidv4();
  }
  next();
});

// ★ スキーマ変数名を変更: RoomSchema -> SessionSchema
SessionSchema.index({ hostUserId: 1 }); 
SessionSchema.index({ status: 1 }); 
SessionSchema.index({ joinToken: 1 }, { unique: true }); 

// ★ モデル名を変更: Room -> Session, IRoom -> ISession
export default mongoose.model<ISession>('Session', SessionSchema); 