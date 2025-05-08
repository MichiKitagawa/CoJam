'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'performer' | 'audience';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole
}) => {
  const { state } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 認証チェック
    if (!state.loading && !state.isAuthenticated) {
      router.push('/login');
      return;
    }

    // 役割チェック（必要な場合）
    if (
      requiredRole &&
      state.user &&
      state.user.role !== requiredRole
    ) {
      router.push('/dashboard');
    }
  }, [state.isAuthenticated, state.loading, state.user, router, requiredRole]);

  // ロード中または認証/認可に失敗した場合は何も表示しない
  if (state.loading || !state.isAuthenticated) {
    return <div className="flex items-center justify-center min-h-screen">ロード中...</div>;
  }

  // 認証/認可に成功した場合は子コンポーネントを表示
  return <>{children}</>;
};

export default ProtectedRoute; 