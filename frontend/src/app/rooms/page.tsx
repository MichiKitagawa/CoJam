'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getRooms, RoomQueryParams, Room } from '../../services/roomService';
import { useAuth } from '../../contexts/AuthContext';
import RoomCard from '../../components/rooms/RoomCard';
import RoomFilters from '../../components/rooms/RoomFilters';
import Pagination from '../../components/common/Pagination';
import { PlusIcon, ExclamationCircleIcon, MinusCircleIcon } from '@heroicons/react/24/outline';

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
    <div className="min-h-screen next-section">
      <div className="next-container">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 sm:mb-10 pb-6 sm:pb-8 border-b border-gray-200">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-800">
              セッションルーム
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              お気に入りのミュージシャンと一緒にセッションを楽しみましょう
            </p>
          </div>
          
          {state.isAuthenticated && (
            <button
              onClick={handleCreateRoom}
              className="next-button button-primary mt-6 sm:mt-0 shrink-0 text-base"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              新規ルーム作成
            </button>
          )}
        </div>
        
        <RoomFilters 
          filters={filters} 
          onFilterChange={handleFilterChange} 
        />
        
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="flex flex-col items-center">
              <svg className="animate-spin h-8 w-8 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-4 text-sm text-gray-500">ルーム情報を取得中...</p>
            </div>
          </div>
        ) : error ? (
          <div className="next-card p-6 sm:p-8 my-8 text-center border-red-300 bg-red-50">
            <div className="flex flex-col items-center">
              <ExclamationCircleIcon className="h-12 w-12 text-red-400 mb-3" />
              <h3 className="text-lg font-semibold text-red-700 mb-1">エラーが発生しました</h3>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        ) : rooms.length === 0 ? (
          <div className="next-card p-8 sm:p-12 my-8 text-center">
            <MinusCircleIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="mt-3 text-xl font-semibold text-gray-700">ルームが見つかりませんでした</h3>
            <p className="mt-2 text-base text-gray-500">検索条件を変更するか、新しいルームを作成してみましょう</p>
            {state.isAuthenticated && (
              <button
                onClick={handleCreateRoom}
                className="next-button button-secondary mt-8 text-base"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                新規ルーム作成
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
          <div className="mt-8">
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