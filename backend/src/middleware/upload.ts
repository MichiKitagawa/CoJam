import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// アップロードディレクトリの確認と作成
const uploadDir = path.join(__dirname, '../../uploads/profile');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ストレージ設定
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req: Request, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    // ユーザーIDがない場合はデフォルト名を使用
    const userId = req.user?.id || 'unknown';
    cb(null, `${userId}-${uniqueSuffix}${ext}`);
  }
});

// ファイルフィルター
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('サポートされていない画像形式です。JPEG、PNG、GIF形式のみ許可されています。'));
  }
};

// Multerの設定
export const profileUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB制限
  },
  fileFilter
});

export default {
  profileUpload
}; 