'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { joinRoom } from '../../../services/roomService';
import FormInput from '../../../components/common/FormInput';

const JoinRoomPage: React.FC = () => {
  const { state } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // URLパラメータからトークンを取得
  const tokenFromUrl = searchParams?.get('token');
  
  // ステート
  const [joinToken, setJoinToken] = useState<string>(tokenFromUrl || '');
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [autoJoinAttempted, setAutoJoinAttempted] = useState<boolean>(false);
  
  // URLからのトークンで自動参加を試みる
  useEffect(() => {
    if (tokenFromUrl && state.isAuthenticated && !autoJoinAttempted) {
      handleJoinRoom(tokenFromUrl);
      setAutoJoinAttempted(true);
    }
  }, [tokenFromUrl, state.isAuthenticated, autoJoinAttempted]);
  
  // 認証されていない場合はログインページにリダイレクト
  useEffect(() => {
    if (!state.loading && !state.isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent('/rooms/join' + (tokenFromUrl ? `?token=${tokenFromUrl}` : ''))}`);
    }
  }, [state.loading, state.isAuthenticated, router, tokenFromUrl]);
  
  // ルーム参加処理
  const handleJoinRoom = async (token: string = joinToken) => {
    if (!token.trim()) {
      setError('参加トークンを入力してください');
      return;
    }
    
    setIsJoining(true);
    setError(null);
    
    try {
      const response = await joinRoom({ joinToken: token });
      
      if (response.success && response.data) {
        // 参加成功したらルーム詳細ページへリダイレクト
        router.push(`/rooms/${response.data.roomId}`);
      } else {
        setError(response.message || 'ルームへの参加に失敗しました');
      }
    } catch (err) {
      console.error('ルーム参加エラー:', err);
      setError('ルーム参加処理中にエラーが発生しました');
    } finally {
      setIsJoining(false);
    }
  };
  
  // フォーム送信ハンドラー
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleJoinRoom();
  };
  
  // 入力変更ハンドラー
  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setJoinToken(e.target.value);
    setError(null);
  };
  
  // ローディング表示
  if (state.loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-500">ロード中...</p>
      </div>
    );
  }
  
  // 認証済みの場合はフォームを表示
  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <h1 className="text-3xl font-bold mb-6 text-center">ルームに参加</h1>
      
      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-6">
          <p>{error}</p>
        </div>
      )}
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <form onSubmit={handleSubmit}>
          <FormInput
            label="参加トークン"
            name="joinToken"
            value={joinToken}
            onChange={handleTokenChange}
            placeholder="ルームの参加トークンを入力"
            required
          />
          
          <div className="mt-6">
            <button
              type="submit"
              disabled={isJoining}
              className={`w-full py-3 px-4 rounded-md text-white font-medium ${
                isJoining
                  ? 'bg-indigo-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isJoining ? '参加処理中...' : 'ルームに参加'}
            </button>
          </div>
        </form>
        
        <div className="mt-4 text-center">
          <button
            onClick={() => router.push('/rooms')}
            className="text-indigo-600 hover:text-indigo-800"
          >
            ルーム一覧に戻る
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinRoomPage; 