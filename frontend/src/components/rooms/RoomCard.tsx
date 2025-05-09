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
  // ランダムな背景グラデーションを生成（ルームIDに基づいて一貫性を持たせる）
  const getGradient = () => {
    const colors = [
      'from-blue-500 to-purple-500',
      'from-green-400 to-blue-500',
      'from-yellow-400 to-orange-500',
      'from-pink-500 to-rose-500',
      'from-indigo-500 to-purple-600',
      'from-cyan-400 to-blue-500',
      'from-amber-400 to-orange-500',
      'from-emerald-400 to-teal-500',
    ];
    
    // ルームIDから一貫性のあるインデックスを生成
    const index = room.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  return (
    <div 
      className="relative group bg-white rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
      onClick={onClick}
    >
      {/* カード上部の装飾的な背景部分 */}
      <div className={`h-24 w-full bg-gradient-to-r ${getGradient()} relative`}>
        <RoomStatusBadge status={room.status} size="sm" className="absolute top-3 right-3" />
        
        {room.isPaid && room.price && (
          <div className="absolute top-3 left-3 bg-white bg-opacity-90 px-2 py-1 rounded-full shadow-sm">
            <span className="text-green-600 font-semibold text-sm">
              ¥{room.price.toLocaleString()}
            </span>
          </div>
        )}
      </div>
      
      {/* ホストユーザーのアバター */}
      <div className="absolute -mt-8 ml-4">
        <UserAvatar user={room.hostUser} size={48} className="border-4 border-white shadow-md" />
      </div>
      
      <div className="p-4 pt-8">
        <h3 className="text-lg font-semibold line-clamp-1 mt-2">{room.title}</h3>
        
        <p className="text-gray-600 text-sm line-clamp-2 h-10 mb-3 mt-2">
          {room.description || 'No description provided'}
        </p>
        
        <div className="mt-4 flex justify-between items-center text-xs text-gray-500 border-t border-gray-100 pt-3">
          <div>
            <div className="flex items-center">
              <svg className="h-4 w-4 text-gray-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>{room.currentParticipants}/{room.maxParticipants}</span>
            </div>
          </div>
          
          <div>
            {room.status === 'scheduled' && room.scheduledStartAt ? (
              <div className="flex items-center">
                <svg className="h-4 w-4 text-gray-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{formatDate(room.scheduledStartAt)}</span>
              </div>
            ) : room.status === 'live' && room.startedAt ? (
              <div className="flex items-center">
                <svg className="h-4 w-4 text-red-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
                <span className="text-red-500 font-medium">ライブ中</span>
              </div>
            ) : (
              <div className="flex items-center">
                <svg className="h-4 w-4 text-gray-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{formatDate(room.createdAt)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* ホバー時のオーバーレイ効果 */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute bottom-4 left-4 right-4">
          <div className="text-white font-medium">
            <span>ホスト: {room.hostUser.name}</span>
          </div>
          <div className="mt-2">
            <span className="inline-block bg-white/90 text-indigo-600 text-xs font-medium px-2 py-1 rounded-full">
              詳細を見る
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomCard; 