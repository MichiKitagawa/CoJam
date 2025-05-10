'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import userService, { UpdateProfileData } from '../../services/userService';
import { ChevronLeftIcon, PencilIcon, XCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const ProfilePage = () => {
  const { state, clearError } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // プロフィールフォームの状態
  const [formData, setFormData] = useState<UpdateProfileData>({
    name: '',
    bio: '',
  });

  // 初期データのロード
  useEffect(() => {
    if (state.user) {
      setFormData({
        name: state.user.name || '',
        bio: state.user.bio || '',
      });
    }
  }, [state.user]);

  // フォーム入力の処理
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // プロフィール更新の処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      if (state.user) {
        const updatedUser = await userService.updateUserProfile(state.user.id, formData);
        setSuccessMessage('プロフィールが正常に更新されました');
        setIsEditing(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'プロフィールの更新中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="next-section">
        <div className="next-container">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 next-fadeIn">
            <div>
              <h1 className="next-heading next-gradient-text mb-2">
                プロフィール
              </h1>
              <p className="next-subheading max-w-2xl">
                アカウント情報と自己紹介を管理できます
              </p>
            </div>
            
            <Link
              href="/dashboard"
              className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 next-button button-secondary text-sm"
            >
              <ChevronLeftIcon className="h-3.5 w-3.5 mr-2" />
              ダッシュボードに戻る
            </Link>
          </div>
          
          <div className="next-card overflow-hidden next-fadeIn" style={{ animationDelay: '0.1s' }}>
            {error && (
              <div className="bg-red-500/10 border-l-4 border-red-500 text-red-300 p-4 rounded-md m-6 next-fadeIn">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <XCircleIcon className="h-3.5 w-3.5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            {successMessage && (
              <div className="bg-green-500/10 border-l-4 border-green-500 text-green-300 p-4 rounded-md m-6 next-fadeIn">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <CheckCircleIcon className="h-3.5 w-3.5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">{successMessage}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="px-6 py-5 border-b border-zinc-800 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold text-zinc-100">
                  ユーザー情報
                </h3>
                <p className="mt-1 text-sm text-zinc-400">
                  個人情報とプロフィール設定
                </p>
              </div>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-all duration-200 shadow-md transform hover:-translate-y-0.5"
                >
                  <PencilIcon className="h-3.5 w-3.5 mr-2" />
                  編集
                </button>
              )}
            </div>
            
            {!isEditing ? (
              <div className="divide-y divide-zinc-800">
                <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <span className="text-sm font-medium text-zinc-400">名前</span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-base text-zinc-100">{state.user?.name}</span>
                  </div>
                </div>
                
                <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <span className="text-sm font-medium text-zinc-400">メールアドレス</span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-base text-zinc-100">{state.user?.email}</span>
                  </div>
                </div>
                
                <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <span className="text-sm font-medium text-zinc-400">ユーザータイプ</span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-900 text-indigo-200">
                      {state.user?.role === 'performer' ? '演奏者' : 'リスナー'}
                    </span>
                  </div>
                </div>
                
                <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <span className="text-sm font-medium text-zinc-400">自己紹介</span>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-base text-zinc-300 whitespace-pre-line">
                      {state.user?.bio || '自己紹介はまだ設定されていません'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <form onSubmit={handleSubmit}>
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-1">
                        名前
                      </label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="block w-full px-3 py-3 bg-zinc-800 border border-zinc-700 rounded-lg shadow-sm placeholder-zinc-500 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="bio" className="block text-sm font-medium text-zinc-300 mb-1">
                        自己紹介
                      </label>
                      <textarea
                        id="bio"
                        name="bio"
                        rows={5}
                        value={formData.bio}
                        onChange={handleChange}
                        className="block w-full px-3 py-3 bg-zinc-800 border border-zinc-700 rounded-lg shadow-sm placeholder-zinc-500 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="inline-flex justify-center items-center py-2 px-4 border border-zinc-700 shadow-md text-sm font-medium rounded-lg text-zinc-300 bg-zinc-800 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-600 transition-all duration-200"
                      >
                        キャンセル
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-lg text-sm font-medium rounded-lg text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-50 transition-all duration-200"
                      >
                        {isLoading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            保存中...
                          </>
                        ) : '保存'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default ProfilePage; 