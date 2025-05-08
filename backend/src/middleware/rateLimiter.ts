import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// ログイン試行回数制限
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分間
  max: 5, // 最大5回まで
  message: {
    message: 'ログイン試行回数が多すぎます。15分後に再試行してください。'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export default {
  loginLimiter
}; 