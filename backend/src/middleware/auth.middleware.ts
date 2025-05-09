import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';

// JWTペイロードの型定義
export interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

// 認証済みリクエストの型定義
export interface AuthRequest extends Request {
  user: JwtPayload;
}

// JWT認証ミドルウェア
export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({ success: false, message: '認証トークンがありません' });
      return;
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as JwtPayload;
    const user = await User.findById(decoded.id);
    
    if (!user) {
      res.status(401).json({ success: false, message: 'ユーザーが見つかりません' });
      return;
    }
    
    (req as AuthRequest).user = {
      id: user?._id ? user._id.toString() : '',
      email: user.email,
      role: user.role
    };
    
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: '認証に失敗しました' });
  }
};

// オプショナル認証ミドルウェア - トークンがある場合のみユーザー情報を設定
export const optionalAuthMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      // トークンがなくても次に進む
      return next();
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as JwtPayload;
    const user = await User.findById(decoded.id);
    
    if (user) {
      (req as AuthRequest).user = {
        id: user?._id ? user._id.toString() : '',
        email: user.email,
        role: user.role
      };
    }
    
    next();
  } catch (error) {
    // エラーがあっても認証は必須ではないので次に進む
    next();
  }
};

// 特定のロールを持つユーザーのみアクセスを許可するミドルウェア
export const roleMiddleware = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;
    
    if (!authReq.user) {
      res.status(401).json({ success: false, message: '認証が必要です' });
      return;
    }
    
    if (!roles.includes(authReq.user.role)) {
      res.status(403).json({ success: false, message: 'この操作を実行する権限がありません' });
      return;
    }
    
    next();
  };
}; 