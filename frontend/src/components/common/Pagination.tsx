import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ 
  currentPage, 
  totalPages, 
  onPageChange 
}) => {
  // ページ範囲の計算
  const getPageRange = () => {
    const range = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      // 総ページ数が5以下なら全ページ表示
      for (let i = 1; i <= totalPages; i++) {
        range.push(i);
      }
    } else {
      // 現在のページを中心に表示
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxPagesToShow - 1);
      
      // 終端調整
      if (end === totalPages) {
        start = Math.max(1, end - maxPagesToShow + 1);
      }
      
      for (let i = start; i <= end; i++) {
        range.push(i);
      }
      
      // 省略記号の表示
      if (start > 1) {
        range.unshift(-1); // -1は省略記号を表示するための特別な値
        range.unshift(1);
      }
      
      if (end < totalPages) {
        range.push(-2); // -2は省略記号を表示するための特別な値
        range.push(totalPages);
      }
    }
    
    return range;
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex justify-center space-x-1">
      {/* 前のページボタン */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`px-3 py-1 rounded-md ${
          currentPage === 1
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-white text-gray-600 hover:bg-gray-100'
        }`}
      >
        前へ
      </button>
      
      {/* ページ番号 */}
      {getPageRange().map((page, index) => (
        <React.Fragment key={index}>
          {page === -1 || page === -2 ? (
            <span className="px-3 py-1">...</span>
          ) : (
            <button
              onClick={() => onPageChange(page)}
              className={`px-3 py-1 rounded-md ${
                page === currentPage
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {page}
            </button>
          )}
        </React.Fragment>
      ))}
      
      {/* 次のページボタン */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`px-3 py-1 rounded-md ${
          currentPage === totalPages
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-white text-gray-600 hover:bg-gray-100'
        }`}
      >
        次へ
      </button>
    </div>
  );
};

export default Pagination; 