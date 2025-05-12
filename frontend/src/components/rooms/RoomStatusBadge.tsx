import React from 'react';
import { formatDate } from '../../utils/dateFormatter';

interface RoomStatusBadgeProps {
  status: 'scheduled' | 'ready' | 'live' | 'ended';
  scheduledStartAt?: string | Date;
  size?: 'sm' | 'md';
  className?: string;
}

const RoomStatusBadge: React.FC<RoomStatusBadgeProps> = ({ status, scheduledStartAt, size = 'md', className = '' }) => {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';
  let badgeStyles = '';
  let content = <></>;

  switch (status) {
    case 'live':
      badgeStyles = `bg-orange-100 text-orange-700 border border-orange-200 ${sizeClasses} rounded-full inline-flex items-center font-semibold ${className}`;
      content = (
        <>
          <span className="w-2 h-2 bg-orange-500 rounded-full mr-1.5 animate-pulse"></span>
          ライブ中
        </>
      );
      break;
    case 'ready':
      badgeStyles = `bg-green-100 text-green-700 border border-green-200 ${sizeClasses} rounded-full inline-flex items-center font-semibold ${className}`;
      content = (
        <>
          <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
          準備完了
        </>
      );
      break;
    case 'scheduled':
      badgeStyles = `bg-sky-100 text-sky-700 border border-sky-200 ${sizeClasses} rounded-full inline-flex items-center font-semibold ${className}`;
      let displayDate = '予定';
      if (scheduledStartAt) {
        const dateToFormat = typeof scheduledStartAt === 'string' ? scheduledStartAt : scheduledStartAt.toISOString();
        displayDate = `予定: ${formatDate(dateToFormat, true)}`;
      }
      content = (
        <>
          <span className="w-2 h-2 bg-sky-500 rounded-full mr-1.5"></span>
          {displayDate}
        </>
      );
      break;
    case 'ended':
      badgeStyles = `bg-gray-100 text-gray-600 border border-gray-200 ${sizeClasses} rounded-full inline-flex items-center font-medium ${className}`;
      content = (
        <>
          <span className="w-2 h-2 bg-gray-400 rounded-full mr-1.5"></span>
          終了
        </>
      );
      break;
    default:
      return null;
  }

  return <span className={badgeStyles}>{content}</span>;
};

export default RoomStatusBadge; 