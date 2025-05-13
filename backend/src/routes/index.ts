import { Router } from 'express';
import userRoutes from './userRoutes';
// import roomRoutes from './roomRoutes'; // 旧パス
import sessionRoutes from './sessionRoutes'; // ★ 新パス
import authRoutes from './authRoutes';
// import uploadRoutes from './uploadRoutes'; // uploadRoutes.ts が存在しないためコメントアウト

const router = Router();

// 認証ルート
router.use('/auth', authRoutes);

// ユーザールート
router.use('/users', userRoutes);

// ルームルート
// router.use('/rooms', roomRoutes); // 旧エンドポイント
router.use('/sessions', sessionRoutes); // ★ 新エンドポイント
// router.use('/upload', uploadRoutes); // uploadRoutes.ts が存在しないためコメントアウト

export default router; 