import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

// ユーザー登録バリデーション
export const validateRegister = [
  // 名前のバリデーション
  body('name')
    .notEmpty().withMessage('名前は必須です')
    .isLength({ min: 2, max: 30 }).withMessage('名前は2〜30文字である必要があります'),

  // メールアドレスのバリデーション
  body('email')
    .notEmpty().withMessage('メールアドレスは必須です')
    .isEmail().withMessage('有効なメールアドレスを入力してください')
    .normalizeEmail(),

  // パスワードのバリデーション
  body('password')
    .notEmpty().withMessage('パスワードは必須です')
    .isLength({ min: 6 }).withMessage('パスワードは6文字以上である必要があります')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]/).withMessage('パスワードには少なくとも1つの大文字、小文字、数字を含める必要があります'),

  // バリデーション結果の確認
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// ログインバリデーション
export const validateLogin = [
  // メールアドレスのバリデーション
  body('email')
    .notEmpty().withMessage('メールアドレスは必須です')
    .isEmail().withMessage('有効なメールアドレスを入力してください'),

  // パスワードのバリデーション
  body('password')
    .notEmpty().withMessage('パスワードは必須です'),

  // バリデーション結果の確認
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// プロフィール更新バリデーション
export const validateProfileUpdate = [
  // 名前のバリデーション
  body('name')
    .optional()
    .isLength({ min: 2, max: 30 }).withMessage('名前は2〜30文字である必要があります'),

  // 自己紹介のバリデーション
  body('bio')
    .optional()
    .isLength({ max: 500 }).withMessage('自己紹介は500文字以内である必要があります'),

  // バリデーション結果の確認
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

export default {
  validateRegister,
  validateLogin,
  validateProfileUpdate
}; 