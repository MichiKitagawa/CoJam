import express from 'express';
import roomController from '../controllers/roomController';
import { authMiddleware, optionalAuthMiddleware, roleMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

// ルーム作成 - パフォーマーロールのみ許可
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['performer']),
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

export default router; 