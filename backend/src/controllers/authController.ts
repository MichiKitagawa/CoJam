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

// ユーザーログイン
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // ユーザーの検索
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: 'メールアドレスまたはパスワードが無効です' });
      return;
    }

    // パスワードの検証
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      res.status(401).json({ message: 'メールアドレスまたはパスワードが無効です' });
      return;
    }

    // JWT生成
    const token = authConfig.generateToken(user);

    // 応答の返却
    res.json({
      message: 'ログインに成功しました',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        bio: user.bio
      },
      token,
      expiresIn: authConfig.JWT_EXPIRES_IN
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'ログイン処理中にエラーが発生しました' });
  }
};

// セッション更新（トークン再発行）
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    // ユーザーIDは認証ミドルウェアから取得
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '認証が必要です' });
      return;
    }

    // ユーザー情報の取得
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'ユーザーが見つかりません' });
      return;
    }

    // 新しいトークンの発行
    const token = authConfig.generateToken(user);

    res.json({
      message: 'トークンが更新されました',
      token,
      expiresIn: authConfig.JWT_EXPIRES_IN
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ message: 'トークン更新中にエラーが発生しました' });
  }
};

// ログアウト処理
export const logoutUser = async (req: Request, res: Response): Promise<void> => {
  // クライアント側でトークンを破棄するため、サーバー側での特別な処理は不要
  res.json({ message: 'ログアウトしました' });
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
  loginUser,
  refreshToken,
  logoutUser,
  getCurrentUser
}; 