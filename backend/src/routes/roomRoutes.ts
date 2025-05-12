import express from 'express';
import roomController from '../controllers/roomController';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

// ルーム作成
router.post(
  '/',
  authMiddleware,
  roomController.createRoom
);

// ルーム一覧取得 - 認証不要（公開情報）
router.get('/', roomController.getRooms);

// 自分が参加中または作成したルーム一覧取得 - 認証必要
router.get(
  '/my-rooms',
  authMiddleware,
  roomController.getMyRooms
);

// ルーム詳細取得 - 認証任意（認証情報があれば権限情報が追加される）
router.get(
  '/:id',
  optionalAuthMiddleware,
  roomController.getRoomById
);

// ルーム参加
router.post(
  '/join',
  authMiddleware,
  roomController.joinRoom
);

// ルーム退出
router.post(
  '/:id/leave',
  authMiddleware,
  roomController.leaveRoom
);

// ルーム終了 (ホストのみ)
router.post(
  '/:id/end',
  authMiddleware,
  roomController.endRoom
);

// 演者参加申請
router.post(
  '/:roomId/apply',
  authMiddleware,
  roomController.applyToRoomAsPerformer
);

// ルームへの参加申請一覧取得 (ホストのみ)
router.get(
  '/:roomId/applications',
  authMiddleware,
  roomController.getRoomApplications
);

// 参加申請への対応 (ホストのみ)
router.post(
  '/:roomId/applications/:applicationId/respond',
  authMiddleware,
  roomController.respondToRoomApplication
);

// ルーム開始
router.post('/:roomId/start', authMiddleware, roomController.startRoom);

export default router; 