import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  // 表示するページネーションのリンク数
  const maxVisiblePages = 5;
  
  // 表示するページ番号の配列を生成
  const getPageNumbers = () => {
    const pageNumbers = [];
    
    if (totalPages <= maxVisiblePages) {
      // 全ページ数が表示数以下の場合はすべて表示
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // 現在のページを中心に表示
      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = startPage + maxVisiblePages - 1;
      
      // endPageが全ページ数を超える場合は調整
      if (endPage > totalPages) {
        endPage = totalPages;
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
      
      // 省略記号を追加
      if (startPage > 1) {
        pageNumbers.unshift('...');
        pageNumbers.unshift(1);
      }
      
      if (endPage < totalPages) {
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }
    
    return pageNumbers;
  };
  
  // 前のページに移動
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };
  
  // 次のページに移動
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };
  
  // ページ数が0の場合は表示しない
  if (totalPages <= 1) {
    return null;
  }
  
  return (
    <nav className="flex justify-center">
      <ul className="flex items-center text-xs">
        {/* 前ページボタン */}
        <li>
          <button
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
            className={`p-1.5 rounded-sm ${
              currentPage === 1
                ? 'text-zinc-600 cursor-not-allowed'
                : 'text-zinc-400 hover:text-zinc-200'
            } transition-colors`}
            aria-label="前のページへ"
          >
            <ChevronLeftIcon className="h-3.5 w-3.5" />
          </button>
        </li>
        
        {/* ページ番号 */}
        {getPageNumbers().map((page, index) => (
          <li key={index}>
            {page === '...' ? (
              <span className="px-1 text-zinc-600">...</span>
            ) : (
              <button
                onClick={() => typeof page === 'number' && onPageChange(page)}
                className={`w-7 h-7 mx-0.5 rounded-sm flex items-center justify-center ${
                  page === currentPage
                    ? 'bg-zinc-800 text-white font-medium border border-zinc-700'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
                } transition-colors text-xs`}
                aria-current={page === currentPage ? 'page' : undefined}
              >
                {page}
              </button>
            )}
          </li>
        ))}
        
        {/* 次ページボタン */}
        <li>
          <button
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            className={`p-1.5 rounded-sm ${
              currentPage === totalPages
                ? 'text-zinc-600 cursor-not-allowed'
                : 'text-zinc-400 hover:text-zinc-200'
            } transition-colors`}
            aria-label="次のページへ"
          >
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Pagination; 