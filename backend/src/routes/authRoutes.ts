import express from 'express';
import authController from '../controllers/authController';
import { authenticateJWT } from '../middleware/auth';
import { validateLogin } from '../middleware/validation';
import { loginLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// 登録
router.post('/register', authController.register);

// ログイン（レート制限付き）
router.post('/login', loginLimiter, validateLogin, authController.loginUser);

// トークン更新（認証済みユーザーのみ）
router.post('/refresh-token', authenticateJWT, authController.refreshToken);

// ログアウト
router.post('/logout', authController.logoutUser);

// 現在のユーザー情報取得（認証必須）
router.get('/me', authenticateJWT, authController.getCurrentUser);

export default router; 