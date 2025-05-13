'use client';
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AuthState, LoginCredentials, RegisterData, User } from '../types/auth';
import authService from '../services/authService';

// ステートインターフェースの拡張
interface ExtendedAuthState extends AuthState {
  authLoading: boolean;
}

// アクションタイプ
type AuthAction =
  | { type: 'LOGIN_REQUEST' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'REGISTER_REQUEST' }
  | { type: 'REGISTER_SUCCESS'; payload: User }
  | { type: 'REGISTER_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_AUTH_LOADING'; payload: boolean };

// 初期状態
const initialState: ExtendedAuthState = {
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
  authLoading: true
};

// リデューサー
const authReducer = (state: ExtendedAuthState, action: AuthAction): ExtendedAuthState => {
  switch (action.type) {
    case 'LOGIN_REQUEST':
    case 'REGISTER_REQUEST':
      return {
        ...state,
        loading: true,
        error: null
      };
    case 'LOGIN_SUCCESS':
    case 'REGISTER_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload,
        loading: false,
        authLoading: false,
        error: null
      };
    case 'LOGIN_FAILURE':
    case 'REGISTER_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        loading: false,
        authLoading: false,
        error: action.payload
      };
    case 'LOGOUT':
      return {
        ...initialState,
        authLoading: false
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    case 'SET_AUTH_LOADING':
      return {
        ...state,
        authLoading: action.payload
      };
    default:
      return state;
  }
};

// コンテキストインターフェース
interface AuthContextProps {
  state: ExtendedAuthState;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

// コンテキスト作成
const AuthContext = createContext<AuthContextProps | undefined>(undefined);

// プロバイダーコンポーネント
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const router = useRouter();

  // 初回マウント時にローカルストレージからトークンを確認
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      loadUser();
    } else {
      dispatch({ type: 'SET_AUTH_LOADING', payload: false });
    }
  }, []);

  // ユーザー情報の取得
  const loadUser = async () => {
    try {
      const { user } = await authService.getCurrentUser();
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
    } catch (error) {
      localStorage.removeItem('token');
      dispatch({ type: 'LOGIN_FAILURE', payload: 'セッションが無効です。再度ログインしてください。' });
    }
  };

  // ログイン
  const login = async (credentials: LoginCredentials) => {
    dispatch({ type: 'LOGIN_REQUEST' });
    try {
      const data = await authService.login(credentials);
      localStorage.setItem('token', data.token);
      dispatch({ type: 'LOGIN_SUCCESS', payload: data.user });

      // リダイレクト処理: URLクエリからredirectを取得
      const urlParams = new URLSearchParams(window.location.search);
      const redirectPath = urlParams.get('redirect');

      // redirectがあればそこへ、なければ/dashboardへ遷移
      router.push(redirectPath || '/dashboard');
      
    } catch (error: any) {
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: error.response?.data?.message || 'ログインに失敗しました'
      });
    }
  };

  // 登録
  const register = async (userData: RegisterData) => {
    dispatch({ type: 'REGISTER_REQUEST' });
    try {
      const data = await authService.register(userData);
      localStorage.setItem('token', data.token);
      dispatch({ type: 'REGISTER_SUCCESS', payload: data.user });
    } catch (error: any) {
      dispatch({
        type: 'REGISTER_FAILURE',
        payload: error.response?.data?.message || '登録に失敗しました'
      });
    }
  };

  // ログアウト
  const logout = () => {
    authService.logout();
    dispatch({ type: 'LOGOUT' });
    router.push('/login');
  };

  // エラークリア
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  return (
    <AuthContext.Provider value={{ state, login, register, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

// カスタムフック
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 
