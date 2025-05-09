import React from 'react';
import { Room } from '../../services/roomService';
import { formatDate } from '../../utils/dateFormatter';
import UserAvatar from '../common/UserAvatar';
import RoomStatusBadge from './RoomStatusBadge';

interface RoomCardProps {
  room: Room;
  onClick: () => void;
}

const RoomCard: React.FC<RoomCardProps> = ({ room, onClick }) => {
  return (
    <div 
      className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-200"
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold line-clamp-1">{room.title}</h3>
          <RoomStatusBadge status={room.status} size="sm" />
        </div>
        
        <p className="text-gray-600 text-sm line-clamp-2 h-10 mb-3">
          {room.description || 'No description provided'}
        </p>
        
        <div className="flex items-center mb-3">
          <UserAvatar user={room.hostUser} size={32} className="mr-2" />
          <span className="text-sm text-gray-700">{room.hostUser.name}</span>
        </div>
        
        <div className="flex justify-between text-xs text-gray-500">
          <div>
            <span>参加者: {room.currentParticipants}/{room.maxParticipants}</span>
          </div>
          <div>
            {room.status === 'scheduled' && room.scheduledStartAt ? (
              <span>開始予定: {formatDate(room.scheduledStartAt)}</span>
            ) : room.status === 'live' && room.startedAt ? (
              <span>開始: {formatDate(room.startedAt)}</span>
            ) : (
              <span>作成: {formatDate(room.createdAt)}</span>
            )}
          </div>
        </div>
        
        {room.isPaid && room.price && (
          <div className="mt-2 text-right">
            <span className="text-green-600 font-medium">
              ¥{room.price.toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomCard; 