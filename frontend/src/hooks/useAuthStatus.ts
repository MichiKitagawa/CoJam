'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types/auth';

interface AuthStatus {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
}

export const useAuthStatus = (): AuthStatus => {
  const { state } = useAuth();
  const [status, setStatus] = useState<AuthStatus>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
  });

  useEffect(() => {
    setStatus({
      isAuthenticated: state.isAuthenticated,
      isLoading: state.loading,
      user: state.user,
    });
  }, [state.isAuthenticated, state.loading, state.user]);

  return status;
}; 
