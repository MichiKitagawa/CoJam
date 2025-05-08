import express from 'express';
import userController from '../controllers/userController';
import { authenticateJWT, authorizeRole } from '../middleware/auth';
import { validateRegister, validateProfileUpdate } from '../middleware/validation';
import { profileUpload } from '../middleware/upload';

const router = express.Router();

// 詳細なユーザー登録（バリデーション付き）
router.post('/register', validateRegister, userController.registerUser);

// 自分のプロフィール取得（認証必須）
router.get('/profile', authenticateJWT, userController.getProfile);

// 自分のプロフィール更新（認証必須）
router.put('/profile', authenticateJWT, validateProfileUpdate, userController.updateProfile);

// プロフィール画像アップロード（認証必須）
router.post('/profile/image', authenticateJWT, profileUpload.single('profileImage'), userController.uploadProfileImage);

// プロフィール更新（拡張版）
router.put('/profile/extended', authenticateJWT, userController.updateUserProfile);

// ユーザー一覧取得（管理者のみ）
router.get('/', authenticateJWT, authorizeRole(['admin']), userController.getAllUsers);

// ユーザープロフィール取得（他のルートの後に配置）
router.get('/:id', userController.getUserProfile);

export default router; 