import express from 'express';
import sessionController from '../controllers/sessionController'; // ★ roomController から変更
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

// セッション作成
router.post(
  '/',
  authMiddleware,
  sessionController.createSession // ★ createRoom から変更
);

// セッション一覧取得 - 認証不要（公開情報）
router.get('/', sessionController.getSessions); // ★ getRooms から変更

// 自分が参加中または作成したセッション一覧取得 - 認証必要
router.get(
  '/my-sessions', 
  authMiddleware,
  sessionController.getMySessions // ★ getMyRooms から変更
);

// セッション詳細取得 - 認証任意（認証情報があれば権限情報が追加される）
router.get(
  '/:sessionId', // ★ /:id を /:sessionId に変更 (または引数名をidのままにするか検討)
  optionalAuthMiddleware,
  sessionController.getSessionById // ★ getRoomById から変更
);

// セッション参加 (※Viewer参加など、参加方法によるルーティング変更の可能性あり)
router.post(
  '/:sessionId/join', // ★ /join から変更し、sessionId をパスに含める
  authMiddleware,
  sessionController.joinSession // ★ joinRoom から変更
);

// セッション退出
router.post(
  '/:sessionId/leave', // ★ id -> sessionId
  authMiddleware,
  sessionController.leaveSession // ★ leaveRoom から変更
);

// セッション終了 (ホストのみ)
router.post(
  '/:sessionId/end', // ★ id -> sessionId
  authMiddleware,
  sessionController.endSession // ★ endRoom から変更
);

// 演者参加申請
router.post(
  '/:sessionId/apply', // ★ roomId -> sessionId
  authMiddleware,
  sessionController.applyToSessionAsPerformer // ★ applyToRoomAsPerformer から変更
);

// セッションへの参加申請一覧取得 (ホストのみ)
router.get(
  '/:sessionId/applications', // ★ roomId -> sessionId
  authMiddleware,
  sessionController.getSessionApplications // ★ getRoomApplications から変更
);

// 参加申請への対応 (ホストのみ)
router.post(
  '/:sessionId/applications/:applicationId/respond', // ★ roomId -> sessionId
  authMiddleware,
  sessionController.respondToSessionApplication // ★ respondToRoomApplication から変更
);

// セッション開始
router.post('/:sessionId/start', authMiddleware, sessionController.startSession); // ★ roomId -> sessionId, startRoom -> startSession

export default router; 