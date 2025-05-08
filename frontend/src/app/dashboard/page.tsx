'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthStatus } from '../../hooks/useAuthStatus';

const DashboardPage = () => {
  const { logout } = useAuth();
  const { user, isPerformer, isAudience } = useAuthStatus();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    // ログアウト後は自動的にログインページにリダイレクトされます
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">CoJam ダッシュボード</h1>
            <div className="flex items-center space-x-4">
              <Link
                href="/profile"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                プロフィール
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                ログアウト
              </button>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
              {user && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">ようこそ、{user.name}さん</h2>
                  <p className="text-gray-600">
                    ユーザータイプ: {isPerformer ? '演奏者' : isAudience ? 'リスナー' : '不明'}
                  </p>
                  <p className="text-gray-600">メールアドレス: {user.email}</p>
                  <div className="mt-2">
                    <Link
                      href="/profile"
                      className="text-sm text-indigo-600 hover:text-indigo-500"
                    >
                      プロフィールを編集する →
                    </Link>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium text-gray-900">ルームを探す</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      公開中のセッションルームを探して参加しましょう。
                    </p>
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => router.push('/rooms')}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        ルーム一覧を見る
                      </button>
                    </div>
                  </div>
                </div>

                {isPerformer && (
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <h3 className="text-lg font-medium text-gray-900">新しいルームを作成</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        自分だけのセッションルームを作成して、他の演奏者と演奏しましょう。
                      </p>
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => router.push('/rooms/create')}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          ルームを作成する
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default DashboardPage; 