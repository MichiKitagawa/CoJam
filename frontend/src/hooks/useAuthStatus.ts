'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types/auth';

interface AuthStatus {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  isPerformer: boolean;
  isAudience: boolean;
}

export const useAuthStatus = (): AuthStatus => {
  const { state } = useAuth();
  const [status, setStatus] = useState<AuthStatus>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    isPerformer: false,
    isAudience: false
  });

  useEffect(() => {
    const isPerformer = state.user?.role === 'performer';
    const isAudience = state.user?.role === 'audience';

    setStatus({
      isAuthenticated: state.isAuthenticated,
      isLoading: state.loading,
      user: state.user,
      isPerformer,
      isAudience
    });
  }, [state.isAuthenticated, state.loading, state.user]);

  return status;
}; 
