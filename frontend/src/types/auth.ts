export interface User {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
  bio?: string;
  activeRoomId?: string | null;
  activeRoomRole?: 'host' | 'performer' | 'viewer' | null;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresIn: string;
} 