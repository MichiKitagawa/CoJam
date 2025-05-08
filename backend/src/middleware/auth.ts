import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// JWTペイロードの型定義
interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

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

  // "Bearer [token]"形式からトークン部分を取得
  const token = authHeader.split(' ')[1];
  
  if (!token) {
    res.status(401).json({ message: '認証トークンが不正です' });
    return;
  }

  try {
    // トークンを検証
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'your_jwt_secret'
    ) as JwtPayload;
    
    // デコードされたユーザー情報をリクエストオブジェクトに追加
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(403).json({ message: '無効または期限切れのトークンです' });
  }
};

export default { authenticateJWT }; 