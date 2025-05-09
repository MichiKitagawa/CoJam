import React from 'react';

interface RoomStatusBadgeProps {
  status: 'scheduled' | 'live' | 'ended';
  size?: 'sm' | 'md';
  className?: string;
}

const RoomStatusBadge: React.FC<RoomStatusBadgeProps> = ({ status, size = 'md', className = '' }) => {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2 py-1';
  
  switch (status) {
    case 'live':
      return (
        <span className={`bg-red-100 text-red-800 ${sizeClasses} rounded-full inline-flex items-center ${className}`}>
          <span className="w-2 h-2 bg-red-600 rounded-full mr-1 animate-pulse"></span>
          ライブ
        </span>
      );
    case 'scheduled':
      return (
        <span className={`bg-blue-100 text-blue-800 ${sizeClasses} rounded-full ${className}`}>
          予定
        </span>
      );
    case 'ended':
      return (
        <span className={`bg-gray-100 text-gray-800 ${sizeClasses} rounded-full ${className}`}>
          終了
        </span>
      );
    default:
      return null;
  }
};

export default RoomStatusBadge; 