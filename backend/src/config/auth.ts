import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { IUser } from '../models/User';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-key-for-development';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

// JWTペイロードの型定義
export interface JwtPayload {
  id: string;
  email: string;
}

// ユーザー情報からJWTトークンを生成
export const generateToken = (user: IUser): string => {
  const payload: JwtPayload = {
    id: user._id instanceof mongoose.Types.ObjectId ? user._id.toString() : String(user._id),
    email: user.email,
  };

  // 型チェックをバイパス
  // @ts-ignore - JSONWebTokenの型定義の問題を回避
  return jwt.sign(
    payload, 
    JWT_SECRET, 
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// リクエストオブジェクトにユーザー情報を追加する型定義の拡張
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export default {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  generateToken
}; 