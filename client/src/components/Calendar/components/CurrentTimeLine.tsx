import React from 'react';
import { CurrentTimeLineProps } from '../utils/types';

export function CurrentTimeLine({
  isCurrentTimeInThisSlot,
  minuteOffsetInSlot
}: CurrentTimeLineProps) {
  if (!isCurrentTimeInThisSlot) return null;

  return (
    <div 
      className="absolute left-0 right-0 h-[3px] bg-red-500 z-30 pointer-events-none"
      style={{ top: `${minuteOffsetInSlot}%` }} 
    />
  );
} 