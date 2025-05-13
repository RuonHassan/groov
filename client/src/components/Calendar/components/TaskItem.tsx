import React from 'react';
import { TaskItemProps } from '../utils/types';
import { getTaskColor, getTextColor } from '../utils/colorUtils';

export function TaskItem({
  task,
  onClick,
  onDragStart,
  onTouchStart,
  width,
  left,
  topPercent,
  heightPercent
}: TaskItemProps) {
  const isCompleted = !!task.completed_at;
  const bgColor = isCompleted ? undefined : getTaskColor(task);
  const textColorClass = bgColor ? getTextColor(bgColor) : 'text-gray-500';

  let taskClasses = `absolute rounded p-1 text-xs overflow-hidden z-10 shadow-sm transition-colors duration-150 ease-in-out select-none ${textColorClass}`;

  // Add smaller text class for short duration tasks
  if (heightPercent <= 15) {
    taskClasses += " text-[10px] leading-[10px] p-[2px]";
  }

  if (isCompleted) {
    taskClasses += " bg-gray-200 text-gray-500 border border-gray-200 cursor-default";
  } else {
    taskClasses += " hover:opacity-90 cursor-pointer";
  }

  return (
    <div
      className={taskClasses}
      style={{
        backgroundColor: bgColor,
        borderColor: bgColor,
        width: `calc(${width}% - 2px)`,
        left: `${left}%`,
        top: `${topPercent}%`,
        height: `${Math.max(heightPercent, 5)}%`,
        borderWidth: '1px',
        borderStyle: 'solid',
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        opacity: isCompleted ? '0.6' : '0.9',
      }}
      draggable={!isCompleted}
      onTouchStart={(e) => !isCompleted && onTouchStart(e, task, bgColor || '#3b82f6')}
      onDragStart={(e) => {
        if (isCompleted) return;
        e.stopPropagation();
        onDragStart(e, task);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!isCompleted) {
          onClick(task);
        }
      }}
    >
      <p className="font-medium truncate">
        {task.title}
      </p>
    </div>
  );
} 