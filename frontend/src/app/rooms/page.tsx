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
      } catch (err) {
        console.error('ルーム一覧取得エラー:', err);
        setError('ルーム一覧の取得中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRooms();
  }, [filters]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">セッションルーム</h1>
        
        {state.user?.role === 'performer' && (
          <button
            onClick={handleCreateRoom}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
          >
            ルームを作成
          </button>
        )}
      </div>
      
      <RoomFilters 
        filters={filters} 
        onFilterChange={handleFilterChange} 
      />
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">ロード中...</p>
        </div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded-md">
          <p>{error}</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="bg-gray-100 p-8 rounded-md text-center">
          <p className="text-gray-500">ルームが見つかりませんでした</p>
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
        <div className="mt-8">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};

export default RoomsPage; 