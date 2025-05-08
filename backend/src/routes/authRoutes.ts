import express from 'express';
import authController from '../controllers/authController';
import { authenticateJWT } from '../middleware/auth';

const router = express.Router();

// 登録
router.post('/register', authController.register);

// ログイン
router.post('/login', authController.login);

// 現在のユーザー情報取得（認証必須）
router.get('/me', authenticateJWT, authController.getCurrentUser);

export default router; 