import { ISession } from '../models/Session';
import mongoose from 'mongoose'; // mongoose.Types.ObjectId を使うためにインポート
import { IUser } from '../models/User'; // IUser の型定義をインポート (パスは適宜修正)

// セッションの演者枠が満員かどうかをチェック (maxParticipants が演者数を指す場合)
export const isSessionFull = (session: ISession): boolean => {
  return session.participants.length >= session.maxParticipants;
};

// セッションがライブ状態かどうかをチェック
export const isSessionLive = (session: ISession): boolean => {
  return session.status === 'live';
};

// セッションが準備完了状態かどうかをチェック
export const isSessionReady = (session: ISession): boolean => {
  return session.status === 'ready';
};

// セッションが予定状態かどうかをチェック
export const isSessionScheduled = (session: ISession): boolean => {
  return session.status === 'scheduled';
};

// セッションが終了状態かどうかをチェック
export const isSessionEnded = (session: ISession): boolean => {
  return session.status === 'ended';
};

// ユーザーがセッションのホストかどうかをチェック
export const isSessionHost = (session: ISession, userId: string): boolean => {
  // session.hostUserId は populate されている想定
  const hostInfo = session.hostUserId as unknown as (Pick<IUser, '_id' | 'name' | 'profileImage'> & { _id: mongoose.Types.ObjectId });

  if (hostInfo && hostInfo._id) {
    return hostInfo._id.toString() === userId;
  }

  // フォールバック (populateされていない場合など)
  if (session.hostUserId instanceof mongoose.Types.ObjectId) {
    console.warn(`isSessionHost: hostUserId was an ObjectId for session ${session._id}. Populate might be missed.`);
    return session.hostUserId.toString() === userId;
  }
  
  console.error(`isSessionHost: Could not determine host status for session ${session._id}. hostUserId:`, session.hostUserId);
  return false;
};

// ユーザーがセッションの参加者 (演者) かどうかをチェック (participants が演者リストの場合)
export const isSessionParticipant = (session: ISession, userId: string): boolean => {
  return session.participants.some(
    // populate されている場合 (_id を持つオブジェクト) とされていない場合 (ObjectId) 両方に対応
    (participant: mongoose.Types.ObjectId | Pick<IUser, '_id'>) => {
      if (participant instanceof mongoose.Types.ObjectId) {
        return participant.toString() === userId;
      } else if (participant && typeof participant === 'object' && '_id' in participant) {
        return participant._id.toString() === userId;
      }
      return false;
    }
  );
}; 