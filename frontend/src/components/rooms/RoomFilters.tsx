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
  const handleStatusChange = (status: 'all' | 'scheduled' | 'live' | 'ended') => {
    onFilterChange({ 
      status: status === 'all' ? undefined : status 
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
    <div className="mb-8 bg-white p-5 rounded-xl shadow-md">
      <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:space-x-4">
        {/* 検索フィールド */}
        <div className="flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              id="search"
              value={filters.search || ''}
              onChange={handleSearchChange}
              placeholder="ルームを検索..."
              className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>
        
        {/* ステータスフィルター */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleStatusChange('all')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              filters.status === undefined
                ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            すべて
          </button>
          <button
            onClick={() => handleStatusChange('scheduled')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              filters.status === 'scheduled'
                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            予定済み
          </button>
          <button
            onClick={() => handleStatusChange('live')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              filters.status === 'live'
                ? 'bg-red-100 text-red-800 border border-red-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ライブ
          </button>
          <button
            onClick={() => handleStatusChange('ended')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              filters.status === 'ended'
                ? 'bg-gray-200 text-gray-800 border border-gray-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            終了
          </button>
        </div>
        
        {/* 並べ替え */}
        <div className="relative flex-shrink-0 min-w-[200px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
            </svg>
          </div>
          <select
            id="sort"
            value={`${filters.sortBy || 'scheduledStartAt'}:${filters.sortOrder || 'desc'}`}
            onChange={handleSortChange}
            className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
          >
            <option value="scheduledStartAt:asc">開始日時（古い順）</option>
            <option value="scheduledStartAt:desc">開始日時（新しい順）</option>
            <option value="createdAt:desc">作成日（新しい順）</option>
            <option value="createdAt:asc">作成日（古い順）</option>
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomFilters; 