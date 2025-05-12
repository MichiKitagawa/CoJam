import User, { IUser } from '../models/User';

export const findUserById = async (userId: string): Promise<IUser | null> => {
  try {
    return await User.findById(userId);
  } catch (error) {
    console.error('ユーザー検索エラー:', error);
    return null;
  }
};

export const findUserByEmail = async (email: string): Promise<IUser | null> => {
  try {
    return await User.findOne({ email });
  } catch (error) {
    console.error('ユーザー検索エラー:', error);
    return null;
  }
};

export const createUser = async (userData: {
  name: string;
  email: string;
  password: string;
}): Promise<IUser | null> => {
  try {
    const user = new User({
      name: userData.name,
      email: userData.email,
      password: userData.password,
    });
    
    return await user.save();
  } catch (error) {
    console.error('ユーザー作成エラー:', error);
    return null;
  }
};

export const updateUserProfile = async (
  userId: string,
  updates: {
    name?: string;
    profileImage?: string;
    bio?: string;
  }
): Promise<IUser | null> => {
  try {
    return await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    );
  } catch (error) {
    console.error('ユーザー更新エラー:', error);
    return null;
  }
};

export default {
  findUserById,
  findUserByEmail,
  createUser,
  updateUserProfile
}; 