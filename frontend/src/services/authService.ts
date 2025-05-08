import axios from 'axios';
import { LoginCredentials, RegisterData, AuthResponse } from '../types/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// HTTPクライアントのインスタンス作成
const api = axios.create({
  baseURL: `${API_URL}/api/auth`,
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

// ユーザー登録
export const register = async (userData: RegisterData): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/register', userData);
  return response.data;
};

// ログイン
export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/login', credentials);
  return response.data;
};

// 現在のユーザー情報取得
export const getCurrentUser = async (): Promise<{ user: AuthResponse['user'] }> => {
  const response = await api.get<{ user: AuthResponse['user'] }>('/me');
  return response.data;
};

// ログアウト（クライアントサイドのみ）
export const logout = (): void => {
  localStorage.removeItem('token');
};

export default {
  register,
  login,
  getCurrentUser,
  logout
}; 