import { Request, Response } from 'express';
import userService from '../services/userService';
import { User } from '../models/index';
import authConfig from '../config/auth';

// ユーザープロフィール取得
export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;
    
    const user = await userService.findUserById(userId);
    if (!user) {
      res.status(404).json({ message: 'ユーザーが見つかりません' });
      return;
    }
    
    // パスワードを除外して返す
    const userProfile = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
      bio: user.bio,
      createdAt: user.createdAt
    };
    
    res.json({ user: userProfile });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'ユーザー情報取得中にエラーが発生しました' });
  }
};

// ユーザープロフィール更新
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    // 認証ミドルウェアでセットされたユーザーIDを使用
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: '認証が必要です' });
      return;
    }
    
    const { name, profileImage, bio } = req.body;
    
    const updatedUser = await userService.updateUserProfile(userId, {
      name,
      profileImage,
      bio
    });
    
    if (!updatedUser) {
      res.status(404).json({ message: 'ユーザーが見つかりません' });
      return;
    }
    
    // 更新後のプロフィールを返す
    const userProfile = {
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      profileImage: updatedUser.profileImage,
      bio: updatedUser.bio,
      updatedAt: updatedUser.updatedAt
    };
    
    res.json({ user: userProfile });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'プロフィール更新中にエラーが発生しました' });
  }
};

// ユーザー登録 - 高度なバージョン
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, bio } = req.body;

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
      role: role || 'audience',
      bio: bio || ''
    });

    await user.save();

    // JWT生成
    const token = authConfig.generateToken(user);

    res.status(201).json({
      message: 'ユーザー登録が完了しました',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        bio: user.bio,
        profileImage: user.profileImage
      },
      token,
      expiresIn: authConfig.JWT_EXPIRES_IN
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'ユーザー登録中にエラーが発生しました' });
  }
};

// ユーザー情報更新（拡張版）
export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: '認証が必要です' });
      return;
    }

    const { name, bio, profileImage } = req.body;
    const updateData: { [key: string]: any } = {};

    if (name) updateData.name = name;
    if (bio) updateData.bio = bio;
    if (profileImage) updateData.profileImage = profileImage;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      res.status(404).json({ message: 'ユーザーが見つかりません' });
      return;
    }

    res.json({
      message: 'プロフィールが更新されました',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        bio: updatedUser.bio,
        profileImage: updatedUser.profileImage
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'プロフィール更新中にエラーが発生しました' });
  }
};

// ユーザー一覧取得（管理機能）
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find().select('-password');
    
    res.json({
      count: users.length,
      users: users.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }))
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'ユーザー情報取得中にエラーが発生しました' });
  }
};

export default {
  getUserProfile,
  updateProfile,
  registerUser,
  updateUserProfile,
  getAllUsers
}; 