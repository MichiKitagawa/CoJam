import React from 'react';
import { RoomQueryParams } from '../../services/roomService';

interface RoomFiltersProps {
  filters: RoomQueryParams;
  onFilterChange: (filters: Partial<RoomQueryParams>) => void;
}

const RoomFilters: React.FC<RoomFiltersProps> = ({ filters, onFilterChange }) => {
  // 検索入力のハンドラー
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ search: e.target.value });
  };
  
  // ステータスフィルターのハンドラー
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onFilterChange({ 
      status: value === 'all' ? undefined : value as 'scheduled' | 'live' | 'ended' 
    });
  };
  
  // 並べ替えのハンドラー
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [sortBy, sortOrder] = e.target.value.split(':');
    onFilterChange({ 
      sortBy, 
      sortOrder: sortOrder as 'asc' | 'desc' 
    });
  };

  return (
    <div className="mb-6 bg-gray-50 p-4 rounded-md">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 検索フィールド */}
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            検索
          </label>
          <input
            type="text"
            id="search"
            value={filters.search || ''}
            onChange={handleSearchChange}
            placeholder="タイトル・説明を検索"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        
        {/* ステータスフィルター */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            ステータス
          </label>
          <select
            id="status"
            value={filters.status || 'all'}
            onChange={handleStatusChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">すべて</option>
            <option value="scheduled">予定済み</option>
            <option value="live">ライブ</option>
            <option value="ended">終了</option>
          </select>
        </div>
        
        {/* 並べ替え */}
        <div>
          <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-1">
            並べ替え
          </label>
          <select
            id="sort"
            value={`${filters.sortBy || 'scheduledStartAt'}:${filters.sortOrder || 'desc'}`}
            onChange={handleSortChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="scheduledStartAt:asc">開始日時（古い順）</option>
            <option value="scheduledStartAt:desc">開始日時（新しい順）</option>
            <option value="createdAt:desc">作成日（新しい順）</option>
            <option value="createdAt:asc">作成日（古い順）</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default RoomFilters; 