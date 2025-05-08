import { Request, Response } from 'express';
import { User } from '../models/index';
import authConfig from '../config/auth';

// ユーザー登録
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;

    // メールアドレスの重複チェック
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: 'このメールアドレスは既に使用されています' });
      return;
    }

    // 新規ユーザー作成
    const user = new User({
      name,
      email,
      password,
      role: role || 'audience'
    });

    await user.save();

    // JWT生成
    const token = authConfig.generateToken(user);

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token,
      expiresIn: authConfig.JWT_EXPIRES_IN
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'ユーザー登録中にエラーが発生しました' });
  }
};

// ログイン
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // ユーザー検索
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません' });
      return;
    }

    // パスワード検証
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません' });
      return;
    }

    // JWT生成
    const token = authConfig.generateToken(user);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token,
      expiresIn: authConfig.JWT_EXPIRES_IN
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'ログイン中にエラーが発生しました' });
  }
};

// 現在のユーザー情報取得
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: '認証が必要です' });
      return;
    }

    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      res.status(404).json({ message: 'ユーザーが見つかりません' });
      return;
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        bio: user.bio
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'ユーザー情報取得中にエラーが発生しました' });
  }
};

export default {
  register,
  login,
  getCurrentUser
}; 