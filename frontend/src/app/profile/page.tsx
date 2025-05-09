'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import userService, { UpdateProfileData } from '../../services/userService';

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
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-zinc-900">
        <header className="bg-zinc-900 border-b border-zinc-800 shadow-md">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-indigo-500">プロフィール</h1>
            <Link
              href="/dashboard"
              className="flex items-center text-sm font-medium text-zinc-300 hover:text-zinc-100 transition-colors"
            >
              <svg className="h-5 w-5 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              ダッシュボードに戻る
            </Link>
          </div>
        </header>
        <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="bg-zinc-900 shadow-xl rounded-xl border border-zinc-800 overflow-hidden">
            {error && (
              <div className="bg-red-900/30 border-l-4 border-red-500 text-red-200 p-4 rounded-md m-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            {successMessage && (
              <div className="bg-green-900/30 border-l-4 border-green-500 text-green-200 p-4 rounded-md m-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
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
                  <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
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
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default ProfilePage; 