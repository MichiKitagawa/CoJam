import express from 'express';
import userController from '../controllers/userController';
import { authenticateJWT } from '../middleware/auth';

const router = express.Router();

// ユーザープロフィール取得
router.get('/:id', userController.getUserProfile);

// 自分のプロフィール更新（認証必須）
router.put('/profile', authenticateJWT, userController.updateProfile);

export default router; 