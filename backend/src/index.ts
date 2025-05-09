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

// 静的ファイル提供の設定
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// APIルート
app.get('/', (req, res) => {
  res.json({ message: 'CoJam API サーバーが稼働中です' });
});

// 統合されたルーターを使用
app.use('/api', routes);

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