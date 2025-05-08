import express from 'express';
import userController from '../controllers/userController';
import { authenticateJWT, authorizeRole } from '../middleware/auth';
import { validateRegister } from '../middleware/validation';

const router = express.Router();

// 詳細なユーザー登録（バリデーション付き）
router.post('/register', validateRegister, userController.registerUser);

// ユーザープロフィール取得
router.get('/:id', userController.getUserProfile);

// 自分のプロフィール更新（認証必須）
router.put('/profile', authenticateJWT, userController.updateProfile);

// プロフィール更新（拡張版）
router.put('/profile/extended', authenticateJWT, userController.updateUserProfile);

// ユーザー一覧取得（管理者のみ）
router.get('/', authenticateJWT, authorizeRole(['admin']), userController.getAllUsers);

export default router; 