import { Request, Response } from 'express';
import userService from '../services/userService';

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

export default {
  getUserProfile,
  updateProfile
}; 