import React from 'react';
import Image from 'next/image';
// import { Room } from '../../services/roomService'; // 旧パス
import { Session } from '../../services/sessionService'; // ★ 新パス・新インターフェース名
import { formatDate } from '../../utils/dateFormatter';
import UserAvatar from '../common/UserAvatar';
// import RoomStatusBadge from './RoomStatusBadge'; // 旧パス
import SessionStatusBadge from './SessionStatusBadge'; // ★ 新パス・新コンポーネント名
import { UsersIcon, CurrencyYenIcon } from '@heroicons/react/24/outline';

interface SessionCardProps { // ★ RoomCardProps -> SessionCardProps
  session: Session; // ★ room -> session
  onClick: () => void;
}

const SessionCard: React.FC<SessionCardProps> = ({ session, onClick }) => { // ★ RoomCard -> SessionCard, room -> session
  const thumbnailUrl = session.thumbnailUrl || `/placeholders/room-thumb-${session.id.charCodeAt(0) % 5 + 1}.jpg`; // Placeholder 1-5 (パスは room のまま)

  return (
    <article
      className="next-card flex flex-col cursor-pointer h-full group overflow-hidden"
      onClick={onClick}
      tabIndex={0}
      onKeyPress={(e) => e.key === 'Enter' && onClick()}
    >
      <div className="relative w-full aspect-[16/10] overflow-hidden">
        <Image
          src={thumbnailUrl} 
          alt={`${session.title} のサムネイル`}
          layout="fill"
          objectFit="cover"
          className="transition-transform duration-300 ease-in-out group-hover:scale-105"
        />
        <div className="absolute top-3 right-3">
          <SessionStatusBadge status={session.status} scheduledStartAt={session.scheduledStartAt} size="sm" />
        </div>
      </div>

      <div className="p-4 sm:p-5 flex flex-col flex-grow">
        <div className="flex items-center mb-2 text-xs text-gray-500">
          <UserAvatar user={session.hostUser} size={20} className="mr-1.5" />
          <span className="font-medium truncate group-hover:text-orange-600 transition-colors">{session.hostUser.name}</span>
        </div>

        <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-1.5 line-clamp-2 leading-snug group-hover:text-orange-700 transition-colors">
          {session.title}
        </h3>

        {session.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2 flex-grow leading-relaxed">
            {session.description}
          </p>
        )}
        {!session.description && <div className="flex-grow"></div>}

        <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-200 mt-auto">
          <div className="flex items-center">
            <UsersIcon className="h-4 w-4 mr-1 text-gray-400" />
            <span>{session.currentParticipants}/{session.maxParticipants}</span>
          </div>
          {session.isPaid && session.price && (
            <div className="flex items-center text-emerald-600 font-semibold">
              <CurrencyYenIcon className="h-4 w-4 mr-1" />
              <span>{session.price.toLocaleString()}円</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default SessionCard; // ★ RoomCard -> SessionCard 