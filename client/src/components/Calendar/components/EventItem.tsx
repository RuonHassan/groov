import React from 'react';
import { EventItemProps } from '../utils/types';
import { getEventColor, getTextColor } from '../utils/colorUtils';

export function EventItem({
  event,
  onClick,
  defaultGcalColor,
  externalMeetingColor,
  width,
  left,
  topPercent,
  heightPercent
}: EventItemProps) {
  const bgColor = getEventColor(event, defaultGcalColor, externalMeetingColor);
  const textColorClass = getTextColor(bgColor);

  return (
    <div
      className={`absolute rounded p-1 text-xs overflow-hidden z-10 shadow-sm transition-colors duration-150 ease-in-out cursor-default ${textColorClass}`}
      style={{
        backgroundColor: bgColor,
        borderColor: bgColor,
        width: `calc(${width}% - 2px)`,
        left: `${left}%`,
        top: `${topPercent}%`,
        height: `${Math.max(heightPercent, 5)}%`,
        borderWidth: '1px',
        borderStyle: 'solid',
        opacity: '0.9',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(event);
      }}
    >
      <p className="font-medium truncate">
        {event.summary}
      </p>
    </div>
  );
} 