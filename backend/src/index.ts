import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/database';

// 環境変数を読み込む
dotenv.config();

// データベース接続
connectDB();

// Expressアプリケーションの初期化
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// ミドルウェアの設定
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
}));
app.use(express.json());
app.use(morgan('dev'));

// APIルート
app.get('/', (req, res) => {
  res.json({ message: 'CoJam API サーバーが稼働中です' });
});

// WebSocketイベント
io.on('connection', (socket) => {
  console.log('クライアント接続:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('クライアント切断:', socket.id);
  });
});

// サーバー起動
const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
}); 