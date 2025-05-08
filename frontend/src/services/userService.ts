import axios from 'axios';
import { User } from '../types/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// HTTPクライアントのインスタンス作成
const api = axios.create({
  baseURL: `${API_URL}/api/users`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// リクエストインターセプター（トークン付与）
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ユーザープロフィール更新
export interface UpdateProfileData {
  name?: string;
  bio?: string;
  profileImage?: string;
}

// プロフィール情報取得
export const getUserProfile = async (userId: string): Promise<User> => {
  const response = await api.get<User>(`/${userId}`);
  return response.data;
};

// プロフィール情報更新
export const updateUserProfile = async (userId: string, profileData: UpdateProfileData): Promise<User> => {
  const response = await api.put<User>(`/${userId}`, profileData);
  return response.data;
};

export default {
  getUserProfile,
  updateUserProfile
}; 