import { IRoom } from '../models/Room';
import mongoose from 'mongoose'; // mongoose.Types.ObjectId を使うためにインポート
import { IUser } from '../models/User'; // IUser の型定義をインポート (パスは適宜修正)

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
  // room.hostUserId は populate の結果、IUser の一部の型になっていると期待される
  // (具体的には _id, name, profileImage を持つオブジェクト)
  // もし populate されていない場合、room.hostUserId は ObjectId のはずだが、
  // roomController の現状の実装では常に populate されている。

  const hostInfo = room.hostUserId as unknown as (Pick<IUser, '_id' | 'name' | 'profileImage'> & { _id: mongoose.Types.ObjectId });

  if (hostInfo && hostInfo._id) {
    return hostInfo._id.toString() === userId;
  }

  // フォールバック: 万が一 populate されていないか、予期せぬ構造の場合
  // (現状のコントローラーのロジックではこのパスは通らないはず)
  if (room.hostUserId instanceof mongoose.Types.ObjectId) {
    console.warn(`isRoomHost: hostUserId was an ObjectId for room ${room._id}. This might indicate populate was missed.`);
    return room.hostUserId.toString() === userId;
  }
  
  console.error(`isRoomHost: Could not determine host status for room ${room._id}. hostUserId:`, room.hostUserId);
  return false;
};

// ユーザーがルームに参加しているかどうかをチェック
export const isRoomParticipant = (room: IRoom, userId: string): boolean => {
  return room.participants.some(
    (participantId) => participantId.toString() === userId
  );
}; 