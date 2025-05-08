export interface User {
  id: string;
  name: string;
  email: string;
  role: 'performer' | 'audience';
  profileImage?: string;
  bio?: string;
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
  role: 'performer' | 'audience';
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresIn: string;
} 