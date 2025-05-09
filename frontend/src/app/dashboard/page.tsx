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
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-zinc-900">
        <header className="bg-zinc-900 border-b border-zinc-800 shadow-md">
          <div className="max-w-7xl mx-auto py-5 px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-indigo-500">CoJam</h1>
            <div className="flex items-center space-x-4">
              <Link
                href="/profile"
                className="flex items-center px-3 py-2 text-sm font-medium text-zinc-300 hover:text-zinc-100 transition-all duration-200 rounded-md hover:bg-zinc-800"
              >
                <svg className="w-5 h-5 mr-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                プロフィール
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 border border-zinc-700 text-sm font-medium rounded-lg text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-all duration-200 shadow-md"
              >
                <svg className="w-4 h-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V7.414l-5-5H3zm7 5a1 1 0 00-1 1v5a1 1 0 002 0V9a1 1 0 00-1-1z" clipRule="evenodd" />
                  <path d="M14.293 5.293a1 1 0 011.414 0L17 6.586V15a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1h8.586l-2.293 2.293a1 1 0 010 1.414 1 1 0 001.414 0L14.293 5.293z" />
                </svg>
                ログアウト
              </button>
            </div>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
          {user && (
            <div className="mb-10 bg-gradient-to-r from-zinc-900 to-zinc-900/80 backdrop-blur-sm rounded-xl p-8 shadow-xl border border-zinc-800/80">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-zinc-100">ようこそ、{user.name}さん</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-4">
                    <div className="inline-flex items-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-900 text-indigo-200">
                        {isPerformer ? '演奏者' : isAudience ? 'リスナー' : '不明'}
                      </span>
                    </div>
                    <div className="inline-flex items-center text-sm text-zinc-400">
                      <svg className="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                      {user.email}
                    </div>
                  </div>
                </div>
                
                <Link
                  href="/profile"
                  className="mt-4 md:mt-0 flex items-center px-4 py-2 border border-zinc-700 text-sm font-medium rounded-lg text-zinc-200 bg-zinc-800 hover:bg-zinc-700 transition-all duration-200 shadow-md"
                >
                  <svg className="w-4 h-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  プロフィールを編集
                </Link>
              </div>
            </div>
          )}

          <h3 className="text-xl font-semibold text-zinc-200 mb-6">アクション</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 overflow-hidden shadow-xl rounded-xl border border-zinc-700/80 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
              <div className="px-6 py-6">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0 bg-violet-900/30 p-3 rounded-lg">
                    <svg className="h-6 w-6 text-violet-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="ml-4 text-xl font-semibold text-zinc-100">ルームを探す</h3>
                </div>
                <p className="text-zinc-400 mb-6">
                  公開中のセッションルームを探して参加しましょう。様々なジャンルとレベルのセッションが見つかります。
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/rooms')}
                  className="w-full flex items-center justify-center px-4 py-3 border border-zinc-700 text-sm font-medium rounded-lg text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-all duration-200 shadow-md"
                >
                  <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                  ルーム一覧を見る
                </button>
              </div>
            </div>

            {isPerformer && (
              <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 overflow-hidden shadow-xl rounded-xl border border-zinc-700/80 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
                <div className="px-6 py-6">
                  <div className="flex items-center mb-4">
                    <div className="flex-shrink-0 bg-indigo-900/30 p-3 rounded-lg">
                      <svg className="h-6 w-6 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <h3 className="ml-4 text-xl font-semibold text-zinc-100">新しいルームを作成</h3>
                  </div>
                  <p className="text-zinc-400 mb-6">
                    自分だけのセッションルームを作成して、他の演奏者と一緒に音楽を奏でましょう。ルーム設定をカスタマイズできます。
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push('/rooms/create')}
                    className="w-full flex items-center justify-center px-4 py-3 border border-zinc-700 text-sm font-medium rounded-lg text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-all duration-200 shadow-md"
                  >
                    <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    ルームを作成する
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default DashboardPage; 