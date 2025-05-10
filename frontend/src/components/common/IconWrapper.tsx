import React from 'react';

type IconWrapperProps = {
  children: React.ReactNode;
  size?: keyof typeof sizeMap;
  className?: string;
};

const sizeMap = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
} as const;

const IconWrapper: React.FC<IconWrapperProps> = ({ 
  children, 
  size = 'sm',
  className = ''
}) => {
  return (
    <span className={`inline-flex items-center justify-center ${sizeMap[size]} ${className}`}>
      {children}
    </span>
  );
};

export default IconWrapper; 