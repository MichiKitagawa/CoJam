import express from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import roomRoutes from './roomRoutes';

const router = express.Router();

// 認証ルート
router.use('/auth', authRoutes);

// ユーザールート
router.use('/users', userRoutes);

// ルームルート
router.use('/rooms', roomRoutes);

export default router; 