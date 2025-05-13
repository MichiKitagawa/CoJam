import cron from 'node-cron';
import { Session } from '../models'; 
import { ISession } from '../models/Session'; 

const LIVENESS_CHECK_INTERVAL = '*/1 * * * *'; // 毎分実行

/**
 * スケジュールされたセッションを開始時刻になったら準備完了状態に更新するジョブ
 */
const updateScheduledSessionsToReady = async () => { 
  console.log('Checking for scheduled sessions to set as ready...'); 
  const now = new Date();

  try {
    const sessionsToUpdate = await Session.find({ 
      status: 'scheduled',
      scheduledStartAt: { $lte: now },
    }).exec();

    if (sessionsToUpdate.length > 0) {
      console.log(`Found ${sessionsToUpdate.length} session(s) to update to ready.`); 
      for (const session of sessionsToUpdate) { 
        session.status = 'ready';
        await session.save();
        console.log(`Session ${session.id} updated to ready.`); 
        // TODO: WebSocketで session_status_updated イベントを送信する
        // (例: global.io.to(session.id).emit('session_status_updated', { sessionId: session.id, status: 'ready' });)
      }
    }
  } catch (error) {
    console.error('Error updating scheduled sessions to ready:', error); 
  }
};

/**
 * セッションスケジューラを開始します。
 */
export const startSessionScheduler = () => { 
  cron.schedule(LIVENESS_CHECK_INTERVAL, updateScheduledSessionsToReady, { 
    scheduled: true,
    timezone: "Asia/Tokyo", // サーバーのタイムゾーンに合わせてください
  });
  console.log('Session scheduler started. Will check for sessions to set as ready every minute.'); 
}; 