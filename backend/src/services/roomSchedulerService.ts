import cron from 'node-cron';
import { Room } from '../models';
import { IRoom } from '../models/Room'; // IRoom インターフェースをインポート

const LIVENESS_CHECK_INTERVAL = '*/1 * * * *'; // 毎分実行

/**
 * スケジュールされたルームを開始時刻になったら準備完了状態に更新するジョブ
 */
const updateScheduledRoomsToReady = async () => {
  console.log('Checking for scheduled rooms to set as ready...');
  const now = new Date();

  try {
    const roomsToUpdate = await Room.find({
      status: 'scheduled',
      scheduledStartAt: { $lte: now },
    }).exec();

    if (roomsToUpdate.length > 0) {
      console.log(`Found ${roomsToUpdate.length} room(s) to update to ready.`);
      for (const room of roomsToUpdate) {
        room.status = 'ready';
        await room.save();
        console.log(`Room ${room.id} updated to ready.`);
        // TODO: WebSocketで room_status_change イベントを送信する
        // (例: global.io.to(room.id).emit('room_status_change', { roomId: room.id, status: 'ready' });)
      }
    }
  } catch (error) {
    console.error('Error updating scheduled rooms to ready:', error);
  }
};

/**
 * ルームスケジューラを開始します。
 */
export const startRoomScheduler = () => {
  cron.schedule(LIVENESS_CHECK_INTERVAL, updateScheduledRoomsToReady, {
    scheduled: true,
    timezone: "Asia/Tokyo", // サーバーのタイムゾーンに合わせてください
  });
  console.log('Room scheduler started. Will check for rooms to set as ready every minute.');
}; 