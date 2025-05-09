import { Document } from 'mongoose';
import { IRoom } from '../models/Room';

interface RoomDetails {
  id: string;
  title: string;
  description?: string;
  hostUser: {
    id: string;
    name: string;
    profileImage?: string;
  };
  isPaid: boolean;
  price?: number;
  maxParticipants: number;
  currentParticipants: number;
  isArchiveEnabled: boolean;
  status: string;
  scheduledStartAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  recordingUrl?: string;
  joinToken?: string;
  participants?: Array<{
    id: string;
    name: string;
    profileImage?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export function transformRoomToDetails(
  room: Document & IRoom,
  includeToken: boolean = false,
  includeParticipants: boolean = false
): RoomDetails {
  const roomObj = room.toObject();
  
  // 基本的なルーム詳細情報
  const roomDetails: RoomDetails = {
    id: roomObj._id.toString(),
    title: roomObj.title,
    description: roomObj.description,
    hostUser: roomObj.hostUserId && typeof roomObj.hostUserId !== 'string' ? {
      id: roomObj.hostUserId._id.toString(),
      name: roomObj.hostUserId.name,
      profileImage: roomObj.hostUserId.profileImage
    } : { id: roomObj.hostUserId.toString(), name: 'Unknown Host', profileImage: undefined },
    isPaid: roomObj.isPaid,
    price: roomObj.price,
    maxParticipants: roomObj.maxParticipants,
    currentParticipants: Array.isArray(roomObj.participants) ? roomObj.participants.length : 0,
    isArchiveEnabled: roomObj.isArchiveEnabled,
    status: roomObj.status,
    scheduledStartAt: roomObj.scheduledStartAt,
    startedAt: roomObj.startedAt,
    endedAt: roomObj.endedAt,
    recordingUrl: roomObj.recordingUrl,
    createdAt: roomObj.createdAt,
    updatedAt: roomObj.updatedAt
  };

  // トークンを含める場合（特定の条件下のみ）
  if (includeToken) {
    roomDetails.joinToken = roomObj.joinToken;
  }

  // 参加者情報を含める場合
  if (includeParticipants && Array.isArray(roomObj.participants)) {
    roomDetails.participants = roomObj.participants.map((participant: any) => {
      if (typeof participant === 'string') {
        return { id: participant, name: 'Unknown', profileImage: undefined };
      }
      return {
        id: participant._id.toString(),
        name: participant.name,
        profileImage: participant.profileImage
      };
    });
  }

  return roomDetails;
} 