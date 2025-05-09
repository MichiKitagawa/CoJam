'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getRooms, RoomQueryParams, Room } from '../../services/roomService';
import { useAuth } from '../../contexts/AuthContext';
import RoomCard from '../../components/rooms/RoomCard';
import RoomFilters from '../../components/rooms/RoomFilters';
import Pagination from '../../components/common/Pagination';

const RoomsPage: React.FC = () => {
  const { state } = useAuth();
  const router = useRouter();
  
  // 状態の定義
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<RoomQueryParams>({
    status: undefined,
    search: '',
    page: 1,
    limit: 8
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 8,
    totalPages: 0
  });

  // フィルターが変更された時のハンドラー
  const handleFilterChange = (newFilters: Partial<RoomQueryParams>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  // ページが変更された時のハンドラー
  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  // ルーム作成ページへの遷移
  const handleCreateRoom = () => {
    if (!state.isAuthenticated) {
      router.push('/login?redirect=/rooms/create');
      return;
    }
    
    if (state.user?.role !== 'performer') {
      alert('パフォーマーアカウントのみルームを作成できます');
      return;
    }
    
    router.push('/rooms/create');
  };

  // ルーム詳細ページへの遷移
  const handleRoomClick = (roomId: string) => {
    router.push(`/rooms/${roomId}`);
  };

  // ルーム一覧の取得
  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await getRooms(filters);
        
        if (response.success) {
          setRooms(response.data.rooms);
          setPagination(response.data.pagination);
        } else {
          setError('ルーム一覧の取得に失敗しました');
        }
      } catch (err: any) {
        console.error('ルーム一覧取得エラー:', err);
        let errorMessage = 'ルーム一覧の取得中にエラーが発生しました';
        
        if (err.code === 'ECONNABORTED') {
          errorMessage = 'APIサーバーへの接続がタイムアウトしました。バックエンドサーバーが起動しているか確認してください。';
        } else if (!err.response) {
          errorMessage = 'APIサーバーに接続できません。バックエンドサーバーが起動しているか確認してください。';
        } else if (err.response) {
          errorMessage += `: ${err.response.status} - ${err.response.statusText}`;
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRooms();
  }, [filters]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-zinc-900">
      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-zinc-100">
              セッションルーム一覧
            </h1>
            <p className="mt-2 text-zinc-400 max-w-2xl">
              お気に入りのミュージシャンと一緒にセッションを楽しみましょう。ライブルームに参加するか、新しいルームを作成できます。
            </p>
          </div>
          
          {state.isAuthenticated && state.user?.role === 'performer' && (
            <button
              onClick={handleCreateRoom}
              className="mt-4 md:mt-0 inline-flex items-center justify-center px-6 py-3 border border-zinc-700 text-base font-medium rounded-lg text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 shadow-md transition-all duration-200 transform hover:-translate-y-1"
            >
              <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              新しいルームを作成
            </button>
          )}
        </div>
        
        <RoomFilters 
          filters={filters} 
          onFilterChange={handleFilterChange} 
        />
        
        {loading ? (
          <div className="flex flex-col justify-center items-center h-64 bg-zinc-900 rounded-xl shadow-lg p-8 border border-zinc-800">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500"></div>
            <p className="text-zinc-400 mt-4">ルーム情報を取得中...</p>
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border-l-4 border-red-500 p-6 rounded-lg shadow-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-red-300">エラーが発生しました</h3>
                <p className="text-red-200 mt-1">{error}</p>
              </div>
            </div>
          </div>
        ) : rooms.length === 0 ? (
          <div className="bg-zinc-900 p-10 rounded-xl shadow-md text-center border border-zinc-800">
            <svg className="mx-auto h-16 w-16 text-zinc-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-zinc-300">ルームが見つかりませんでした</h3>
            <p className="mt-2 text-zinc-400">検索条件を変更するか、新しいルームを作成してみましょう</p>
            {state.isAuthenticated && state.user?.role === 'performer' && (
              <button
                onClick={handleCreateRoom}
                className="mt-6 inline-flex items-center px-4 py-2 border border-zinc-700 text-sm font-medium rounded-md text-violet-300 bg-violet-900/30 hover:bg-violet-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
              >
                <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                新しいルームを作成
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {rooms.map((room) => (
              <RoomCard 
                key={room.id} 
                room={room} 
                onClick={() => handleRoomClick(room.id)}
              />
            ))}
          </div>
        )}
        
        {!loading && rooms.length > 0 && (
          <div className="mt-12">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomsPage; 