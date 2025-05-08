import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import authConfig from '../config/auth';
import type { JwtPayload } from '../config/auth';

// Expressのリクエスト型を拡張
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// JWT認証ミドルウェア
export const authenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
  // Authorizationヘッダーからトークンを取得
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    res.status(401).json({ message: '認証トークンがありません' });
    return;
  }

  const token = authHeader.split(' ')[1]; // "Bearer <token>"の形式を想定

  try {
    // トークンを検証
    const decoded = jwt.verify(token, authConfig.JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ message: '無効なトークンです' });
  }
};

// 特定のロールを持つユーザーのみアクセスを許可するミドルウェア
export const authorizeRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: '認証が必要です' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'このアクションを実行する権限がありません' });
      return;
    }

    next();
  };
};

// 演者のみアクセスを許可するミドルウェア
export const requirePerformer = (req: Request, res: Response, next: NextFunction): void => {
  authorizeRole(['performer'])(req, res, next);
};

export default {
  authenticateJWT,
  authorizeRole,
  requirePerformer
}; 