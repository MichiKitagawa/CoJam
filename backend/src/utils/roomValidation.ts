import { IRoom } from '../models/Room';

// ルームが満員かどうかをチェック
export const isRoomFull = (room: IRoom): boolean => {
  return room.participants.length >= room.maxParticipants;
};

// ルームがライブ状態かどうかをチェック
export const isRoomLive = (room: IRoom): boolean => {
  return room.status === 'live';
};

// ユーザーがルームのホストかどうかをチェック
export const isRoomHost = (room: IRoom, userId: string): boolean => {
  return room.hostUserId.toString() === userId;
};

// ユーザーがルームに参加しているかどうかをチェック
export const isRoomParticipant = (room: IRoom, userId: string): boolean => {
  return room.participants.some(
    (participantId) => participantId.toString() === userId
  );
}; 