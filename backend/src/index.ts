import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
// @ts-ignore
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/database';
import routes from './routes';
import path from 'path';
import { JoinSessionPayload, LeaveSessionPayload, SignalPayload } from './types/signaling';
import { startSessionScheduler } from './services/sessionSchedulerService';
import { Session, User, SessionApplication } from './models';
import mongoose from 'mongoose';

// 環境変数を読み込む
dotenv.config();

// データベース接続
connectDB();

const PORT = process.env.PORT || 8080;

// Expressアプリケーションの初期化
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});
app.set('socketio', io);

// ミドルウェア
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
}));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ルート
app.use('/api', routes);

// エラーハンドリングミドルウェア（例）
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// ★ Socket.IO 認証ミドルウェア ★
io.use((socket, next) => {
  // TODO: 本番環境ではトークン検証を実装する
  // const token = socket.handshake.auth.token || socket.handshake.query.token;
  // try {
  //   const decoded = jwt.verify(token, process.env.JWT_SECRET);
  //   socket.data.userId = decoded.id;
  //   next();
  // } catch (error) {
  //    console.error('Socket authentication error:', error);
  //    next(new Error('Authentication error'));
  // }

  // ★★★ 現状はフロントエンドからの auth ペイロードを信頼する ★★★
  const userId = socket.handshake.auth.userId;
  const sessionIdFromAuth = socket.handshake.auth.sessionId;
  if (userId) {
      socket.data.userId = userId.toString();
      if (sessionIdFromAuth) {
          socket.data.sessionId = sessionIdFromAuth.toString();
      }
      console.log(`Socket ${socket.id} authenticated for user ${socket.data.userId} (attempting session: ${socket.data.sessionId})`);
      next();
  } else {
      console.warn(`Socket connection attempt without userId in auth: ${socket.id}`);
      next(new Error("User ID not provided in auth payload"));
  }
});

// WebSocketイベント
io.on('connection', (socket) => {
  console.log('クライアント接続:', socket.id, 'ユーザーID:', socket.data.userId);

  // ★ join-session イベント: DB状態との連携は限定的。主にSocket.IOのセッション機能利用。
  socket.on('join-session', (data: JoinSessionPayload) => {
    const { sessionId, userId } = data;
    
    const targetSessionId = socket.data.sessionId || sessionId;
    if (!targetSessionId) {
        console.error(`Cannot join session: sessionId is missing for socket ${socket.id}`);
        return;
    }
    socket.join(targetSessionId);
    console.log(`${socket.data.userId} (${socket.id}) が Socket.IO セッション ${targetSessionId} に参加しました。`);
    // 他の参加者に通知 (WebRTCContextで処理される)
    // 送信するuserIdはsocket.id (Peer ID)
    socket.to(targetSessionId).emit('user_joined_session', { userId: socket.id, sessionId: targetSessionId });
  });

  // ★ leave-session-socket イベント: DB状態との連携は限定的。
  socket.on('leave-session-socket', (data: LeaveSessionPayload) => {
    const { sessionId, userId } = data;
    if (!sessionId) {
        console.error(`Cannot leave session: sessionId is missing for socket ${socket.id}`);
        return;
    }
    socket.leave(sessionId);
    console.log(`${socket.data.userId} (${socket.id}) が Socket.IO セッション ${sessionId} から退出しました。`);
    // 他の参加者に通知
    // 送信するuserIdはsocket.id (Peer ID)
    socket.to(sessionId).emit('user_left_session', { userId: socket.id, sessionId });
  });

  // ★ signal イベント: 変更なし
  socket.on('signal', (data: SignalPayload) => {
    console.log('signal from', socket.id, 'to', data.to, 'signal:', data.signal ? 'present' : 'missing');
    if(data.to && data.signal) {
        io.to(data.to).emit('signal', { from: socket.id, signal: data.signal });
    } else {
        console.warn('Invalid signal payload received:', data);
    }
  });

  // ★★★ leave-session イベントハンドラ (新規追加) ★★★
  socket.on('leave-session', async (data: { sessionId: string, userId: string }) => {
    const authenticatedUserId = socket.data.userId;
    const eventUserId = data.userId;
    const sessionId = data.sessionId;

    if (!authenticatedUserId || !sessionId || authenticatedUserId !== eventUserId) {
      console.warn(`Invalid leave-session payload or mismatched user from socket ${socket.id}:`, data);
      return;
    }
    console.log(`Received leave-session from user ${authenticatedUserId} for session ${sessionId}`);

    try {
      const session = await Session.findById(sessionId);
      if (!session) {
        console.warn(`Session ${sessionId} not found when user ${authenticatedUserId} tries to leave session.`);
        // ユーザーの状態もクリアしておく方が良いかもしれない
        const userToClean = await User.findById(authenticatedUserId);
        if(userToClean) {
            userToClean.activeSessionId = null;
            userToClean.activeSessionRole = null;
            await userToClean.save();
        }
        return; 
      }

      const user = await User.findById(authenticatedUserId);
      if (!user) {
          console.warn(`User ${authenticatedUserId} not found when trying to leave session ${sessionId}.`);
          return; 
      }

      // ユーザーが本当にそのセッションにアクティブとしてマークされていたか確認
      if (user.activeSessionId?.toString() !== sessionId) {
          console.warn(`User ${authenticatedUserId} is not marked as active in session ${sessionId}. Current active: ${user.activeSessionId}. Ignoring leave-session, but cleaning user state.`);
          user.activeSessionId = null;
          user.activeSessionRole = null;
          await user.save();
          socket.leave(sessionId);
          return;
      }

      const isHost = session.hostUserId.toString() === authenticatedUserId;

      if (isHost) {
        // --- ホストがセッションを退出 → セッション終了 ---
        console.log(`Host ${authenticatedUserId} is leaving session ${sessionId}. Ending the session.`);
        if (session.status !== 'ended') {
          session.status = 'ended';
          session.endedAt = new Date();
          await session.save();
          const participantIds = session.participants.map(p => p.toString());
          // ホスト自身も含め、参加者全員の activeSessionId/Role をクリア
          await User.updateMany(
            { _id: { $in: [...participantIds, session.hostUserId.toString()] } }, // ホストも確実に含める
            { $set: { activeSessionId: null, activeSessionRole: null } }
          );
          io.to(sessionId.toString()).emit('session_status_updated', { status: 'ended', endedAt: session.endedAt });
          console.log(`Ended session ${sessionId} due to host leaving session.`);
        }
      } else {
        // --- 参加者がセッションを退出 ---
        console.log(`Participant ${authenticatedUserId} is leaving session ${sessionId}.`);
        user.activeSessionId = null;
        user.activeSessionRole = null;
        await user.save();
        const initialParticipantCount = session.participants.length;
        session.participants = session.participants.filter(pId => pId.toString() !== authenticatedUserId);
        if (session.participants.length < initialParticipantCount) {
          await session.save();
          // フロントエンドの WebRTCContext は socket.id を userId として期待している点に注意
          io.to(sessionId.toString()).emit('user_left_session', { userId: socket.id, sessionId: sessionId.toString() });
          console.log(`Removed participant ${authenticatedUserId} from session ${sessionId}.`);
        }
      }
      // Socket.IOセッションからも退出させる
      socket.leave(sessionId);

    } catch(error) {
      console.error(`Error handling leave-session for user ${authenticatedUserId} in session ${sessionId}:`, error);
    }
  });

  // ★ disconnect イベントハンドラの修正 ★
  socket.on('disconnect', async (reason) => {
    console.log(`クライアント切断: ${socket.id}, UserID: ${socket.data.userId}, Reason: ${reason}`);
    
    const userId = socket.data.userId;
    if (!userId) {
        console.warn(`UserID not found on disconnected socket: ${socket.id}. Cannot perform cleanup.`);
        return;
    }

    try {
        const user = await User.findById(userId);
        if (user && user.activeSessionId) {
            const activeSessionId = user.activeSessionId;
            console.log(`User ${userId} disconnected while in active session ${activeSessionId}. Performing cleanup...`);
            const session = await Session.findById(activeSessionId);

            if (session) {
                const isHost = session.hostUserId.toString() === userId;

                // ★★★★★ 修正: ホスト切断時にもセッションを終了させる ★★★★★
                if (isHost) {
                  console.log(`Host ${userId} disconnected. Ending session ${activeSessionId}.`);
                  if (session.status !== 'ended') {
                    session.status = 'ended';
                    session.endedAt = new Date();
                    await session.save();
                    const participantIds = session.participants.map(p => p.toString());
                    // ホスト自身も含め、参加者全員の activeSessionId/Role をクリア
                    await User.updateMany(
                      { _id: { $in: [...participantIds, session.hostUserId.toString()] } },
                      { $set: { activeSessionId: null, activeSessionRole: null } }
                    );
                    io.to(activeSessionId.toString()).emit('session_status_updated', { status: 'ended', endedAt: session.endedAt });
                    console.log(`Ended session ${activeSessionId} due to host disconnect.`);
                  } else {
                      // 既に終了している場合はユーザー状態のクリアのみ試みる
                      console.log(`Session ${activeSessionId} was already ended. Clearing host ${userId}'s active state.`);
                      user.activeSessionId = null;
                      user.activeSessionRole = null;
                      await user.save();
                  }
                } else {
                    // --- 参加者が切断した場合 (DBクリーンアップ) ---
                    console.log(`Participant ${userId} disconnected from session ${activeSessionId}. Cleaning up participant.`);
                    user.activeSessionId = null;
                    user.activeSessionRole = null;
                    await user.save();
                    const initialParticipantCount = session.participants.length;
                    session.participants = session.participants.filter(pId => pId.toString() !== userId);
                    if (session.participants.length < initialParticipantCount) {
                        await session.save();
                        io.to(activeSessionId.toString()).emit('user_left_session', { userId: socket.id, sessionId: activeSessionId.toString() });
                        console.log(`Removed participant ${userId} from session ${activeSessionId} due to disconnect.`);
                    }
                }
            } else { 
                console.warn(`Session ${activeSessionId} (from user ${userId}) not found in DB upon disconnect. Clearing user state.`);
                user.activeSessionId = null;
                user.activeSessionRole = null;
                await user.save();
            }
        } else { 
             console.log(`User ${userId} (socket ${socket.id}) not found or was not in an active session upon disconnect.`);
        }
        
        // --- 保留中の参加申請のキャンセル処理 (変更なし) ---
        console.log(`Checking for pending applications for disconnected user ${userId}...`);
        const canceledApplications = await SessionApplication.updateMany(
            { userId: userId, status: 'pending' }, 
            { $set: { status: 'canceled' } }      
        );
        if (canceledApplications.modifiedCount > 0) {
            console.log(`Canceled ${canceledApplications.modifiedCount} pending application(s) for user ${userId}.`);
        }

    } catch (error) {
        console.error(`Error handling disconnect for user ${userId} (socket ${socket.id}):`, error);
    }
  });
});

// 定期実行タスクの開始
startSessionScheduler();

// サーバー起動
httpServer.listen(PORT, () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
}); 