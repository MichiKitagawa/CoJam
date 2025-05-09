import React from 'react';
import Image from 'next/image';

interface UserAvatarProps {
  user: {
    id: string;
    name: string;
    profileImage?: string;
  };
  size?: number;
  className?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ user, size = 40, className = '' }) => {
  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  if (user.profileImage) {
    return (
      <div 
        className={`relative rounded-full overflow-hidden ${className}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={user.profileImage}
          alt={user.name}
          fill
          sizes={`${size}px`}
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-indigo-100 text-indigo-800 font-semibold ${className}`}
      style={{ 
        width: size, 
        height: size, 
        fontSize: Math.max(size / 2.5, 10) 
      }}
    >
      {initials}
    </div>
  );
};

export default UserAvatar; 