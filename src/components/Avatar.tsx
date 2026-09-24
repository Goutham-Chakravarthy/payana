import React from 'react';
import { Participant } from '../types';

interface AvatarProps {
  participant: Participant;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  subtitle?: string;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  participant,
  size = 'md',
  showName = false,
  subtitle,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm font-medium',
    lg: 'w-12 h-12 text-base font-semibold',
    xl: 'w-16 h-16 text-xl font-bold',
  };

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center shrink-0 shadow-xs border border-white/60 select-none`}
        style={{
          backgroundColor: participant.bgColor,
          color: participant.color,
          borderColor: `${participant.color}33`,
        }}
        title={participant.name}
      >
        {participant.initials}
      </div>
      {showName && (
        <div className="flex flex-col min-w-0 text-left">
          <span className="text-sm font-semibold text-zinc-900 truncate">
            {participant.name}
          </span>
          {subtitle && (
            <span className="text-xs text-zinc-500 truncate">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
};
