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
import { JoinRoomPayload, LeaveRoomPayload, SignalPayload, Rooms } from './types/signaling';
import { startRoomScheduler } from './services/roomSchedulerService';

// 環境変数を読み込む
dotenv.config();

// データベース接続
connectDB();

// データベース接続後にスケジューラを開始
startRoomScheduler();

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

// ミドルウェアの設定
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
}));
app.use(express.json());
app.use(morgan('dev'));

// 静的ファイル提供の設定
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// APIルート
app.get('/', (req, res) => {
  res.json({ message: 'CoJam API サーバーが稼働中です' });
});

// 統合されたルーターを使用
app.use('/api', routes);

// ルーム情報を保持するオブジェクト
const rooms: Rooms = {};

// WebSocketイベント
io.on('connection', (socket) => {
  console.log('クライアント接続:', socket.id);

  socket.on('join-room', (data: JoinRoomPayload) => {
    const { roomId, userId } = data;
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = { id: roomId, participants: [] };
    }
    // 既に同じユーザーID (socket.id) が参加していないか確認
    if (!rooms[roomId].participants.includes(socket.id)) {
      rooms[roomId].participants.push(socket.id);
    }

    console.log(`${userId} (${socket.id}) がルーム ${roomId} に参加しました。`);
    console.log('現在のルーム状況:', rooms);

    // ルームの他の参加者に新しい参加者が来たことを通知 (自分自身を除く)
    socket.to(roomId).emit('user-joined', { userId: socket.id, roomId }); 
  });

  socket.on('leave-room', (data: LeaveRoomPayload) => {
    const { roomId, userId } = data;
    socket.leave(roomId);

    if (rooms[roomId]) {
      rooms[roomId].participants = rooms[roomId].participants.filter(id => id !== socket.id);
      if (rooms[roomId].participants.length === 0) {
        delete rooms[roomId]; // 参加者がいなくなったらルーム情報を削除
      }
    }
    console.log(`${userId} (${socket.id}) がルーム ${roomId} から退出しました。`);
    console.log('現在のルーム状況:', rooms);

    // ルームの他の参加者に退出したことを通知
    socket.to(roomId).emit('user-left', { userId: socket.id, roomId });
  });

  socket.on('signal', (data: SignalPayload) => {
    // TODO: シグナリングメッセージ中継処理
    console.log('signal from', socket.id, 'to', data.to, 'signal:', data.signal);
    io.to(data.to).emit('signal', { from: socket.id, signal: data.signal });
  });

  socket.on('disconnect', () => {
    console.log('クライアント切断:', socket.id);
    // ユーザーが参加していた可能性のあるすべてのルームから退出させる
    for (const roomId in rooms) {
      if (rooms[roomId].participants.includes(socket.id)) {
        rooms[roomId].participants = rooms[roomId].participants.filter(id => id !== socket.id);
        console.log(`${socket.id} がルーム ${roomId} から (切断により) 退出しました。`);
        socket.to(roomId).emit('user-left', { userId: socket.id, roomId }); 
        if (rooms[roomId].participants.length === 0) {
          delete rooms[roomId];
          console.log(`ルーム ${roomId} は空になったため削除されました。`);
        }
      }
    }
    console.log('現在のルーム状況 (切断後):', rooms);
  });
});

// サーバー起動
const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
}); 