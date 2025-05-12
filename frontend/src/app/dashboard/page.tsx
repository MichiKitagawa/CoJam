'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthStatus } from '../../hooks/useAuthStatus';
import { 
  UserIcon, 
  EnvelopeIcon, 
  UserCircleIcon, 
  ChevronRightIcon, 
  MagnifyingGlassIcon, 
  PlusIcon, 
  ArrowRightIcon
} from '@heroicons/react/24/outline';

const DashboardPage = () => {
  const { user } = useAuthStatus();
  const router = useRouter();

  return (
    <ProtectedRoute>
      <div className="next-section">
        <div className="next-container">
          {/* Hero Section */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 md:mb-16 next-fadeIn">
            <div>
              <h1 className="next-heading next-gradient-text mb-4">
                ダッシュボード
              </h1>
              <p className="next-subheading max-w-2xl">
                音楽セッションを探索、参加、または新しいルームを作成してみましょう。
              </p>
            </div>
            
            {user && (
              <div className="mt-6 md:mt-0 flex items-center px-6 py-4 next-card">
                <span className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white font-medium text-lg mr-4 shadow-md">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <p className="text-neutral-400 text-sm">ようこそ</p>
                  <p className="text-white font-medium text-lg">{user.name}さん</p>
                </div>
              </div>
            )}
          </div>

          {/* ステータスセクション */}
          <h2 className="text-2xl font-semibold text-white mb-6 next-fadeIn" style={{ animationDelay: '0.1s' }}>アカウント情報</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 md:mb-16">
            <div className="next-card p-6 next-fadeIn" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-indigo-500/10 mr-4">
                  <EnvelopeIcon className="h-4 w-4 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm text-neutral-400">メールアドレス</p>
                  <p className="text-lg font-medium text-white truncate max-w-[180px] sm:max-w-[220px]">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="next-card p-6 next-fadeIn" style={{ animationDelay: '0.4s' }}>
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-teal-500/10 mr-4">
                  <UserCircleIcon className="h-4 w-4 text-teal-400" />
                </div>
                <div>
                  <p className="text-sm text-neutral-400">プロフィール</p>
                  <Link
                    href="/profile"
                    className="inline-flex items-center text-lg font-medium text-white hover:text-violet-400 transition-colors group"
                  >
                    編集する
                    <ChevronRightIcon className="ml-1.5 h-3.5 w-3.5 transform transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
          
          {/* アクションセクション */}
          <h2 className="text-2xl font-semibold text-white mb-6 next-fadeIn" style={{ animationDelay: '0.5s' }}>アクション</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="next-card group next-fadeIn" style={{ animationDelay: '0.6s' }}>
              <div className="p-6 md:p-8">
                <div className="flex flex-col h-full">
                  <div className="mb-6">
                    <div className="w-12 h-12 bg-violet-500/10 rounded-lg flex items-center justify-center mb-5">
                      <MagnifyingGlassIcon className="w-4 h-4 text-violet-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">セッションルームを探す</h3>
                    <p className="text-neutral-400 text-sm leading-relaxed mb-6">
                      現在開催中や予定されているセッションルームをブラウズして、お気に入りのミュージシャンと一緒に演奏しましょう。
                    </p>
                  </div>
                  <div className="mt-auto">
                    <button
                      onClick={() => router.push('/rooms')}
                      className="w-full next-button button-primary flex items-center justify-center text-sm"
                    >
                      ルーム一覧を見る
                      <ArrowRightIcon className="ml-2 h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="next-card group next-fadeIn" style={{ animationDelay: '0.7s' }}>
              <div className="p-6 md:p-8">
                <div className="flex flex-col h-full">
                  <div className="mb-6">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-lg flex items-center justify-center mb-5">
                      <PlusIcon className="w-4 h-4 text-indigo-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">新しいルームを作成</h3>
                    <p className="text-neutral-400 text-sm leading-relaxed mb-6">
                      あなた自身のセッションルームを作成し、他のミュージシャンを招待しましょう。ルームの設定をカスタマイズできます。
                    </p>
                  </div>
                  <div className="mt-auto">
                    <button
                      onClick={() => router.push('/rooms/create')}
                      className="w-full next-button button-primary flex items-center justify-center text-sm"
                    >
                      新しいルームを作成
                      <PlusIcon className="ml-2 h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default DashboardPage; 