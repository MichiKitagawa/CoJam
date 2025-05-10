import React from 'react';
import { RoomQueryParams } from '../../services/roomService';
import { MagnifyingGlassIcon, AdjustmentsHorizontalIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

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

  const statusOptions = [
    { label: 'すべて', value: 'all' as const, color: 'gray' },
    { label: 'ライブ', value: 'live' as const, color: 'orange' },
    { label: '予定', value: 'scheduled' as const, color: 'sky' },
    { label: '終了', value: 'ended' as const, color: 'slate' },
  ];

  return (
    <div className="mb-6 sm:mb-8 p-4 sm:p-5 bg-white border border-gray-200 rounded-xl shadow-lg next-card">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-x-4 gap-y-4 items-center">
        <div className="sm:col-span-2 lg:col-span-5">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={filters.search || ''}
              onChange={handleSearchChange}
              placeholder="ルーム名、ホスト名などで検索..."
              className="w-full py-2.5 pl-10 pr-3 input-dark text-sm rounded-lg"
            />
          </div>
        </div>
        
        <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center gap-2 sm:gap-2.5">
          {statusOptions.map(item => (
            <button
              key={item.value}
              onClick={() => handleStatusChange(item.value)}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${ 
                (filters.status === item.value || (item.value === 'all' && filters.status === undefined))
                  ? item.color === 'orange' ? 'bg-orange-500 text-white hover:bg-orange-600 ring-orange-500' 
                  : item.color === 'sky'   ? 'bg-sky-500 text-white hover:bg-sky-600 ring-sky-500' 
                  : item.color === 'slate' ? 'bg-slate-500 text-white hover:bg-slate-600 ring-slate-500' 
                                         : 'bg-gray-600 text-white hover:bg-gray-700 ring-gray-500'
                  : `bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-800 ring-gray-300`
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        
        <div className="sm:col-span-2 lg:col-span-3 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-400" />
          </div>
          <select
            value={`${filters.sortBy || 'scheduledStartAt'}:${filters.sortOrder || 'desc'}`}
            onChange={handleSortChange}
            className="w-full py-2.5 pl-10 pr-9 input-dark text-sm rounded-lg appearance-none"
          >
            <option value="scheduledStartAt:desc">開始日 (新しい順)</option>
            <option value="scheduledStartAt:asc">開始日 (古い順)</option>
            <option value="createdAt:desc">作成日 (新しい順)</option>
            <option value="createdAt:asc">作成日 (古い順)</option>
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <ChevronDownIcon className="h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomFilters; 