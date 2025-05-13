import React from 'react';
import { format, isSameDay } from 'date-fns';
import { TimeGridProps } from '../utils/types';
import { getItemsForTimeSlot, calculateItemTiming, calculateItemPosition } from '../utils/eventUtils';
import { EventItem } from './EventItem';
import { TaskItem } from './TaskItem';
import { CurrentTimeLine } from './CurrentTimeLine';
import { useCalendarDrag } from '../hooks/useCalendarDrag';
import { useCalendarTouch } from '../hooks/useCalendarTouch';

export function TimeGrid({
  visibleDays,
  timeSlots,
  tasks,
  googleEvents,
  onTimeSlotClick,
  onTaskClick,
  onGoogleEventClick,
  defaultGcalColor,
  externalMeetingColor,
  currentTime
}: TimeGridProps) {
  const {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd
  } = useCalendarDrag();

  const {
    touchState,
    isDragging,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  } = useCalendarTouch();

  const formatWeekdayHeader = (date: Date) => format(date, 'EEE');
  const formatDateHeader = (date: Date) => format(date, 'd');

  return (
    <div className="border-t border-gray-200 overflow-x-hidden">
      <div className={`grid md:grid-cols-[auto_repeat(5,minmax(0,1fr))] grid-cols-[auto_repeat(3,minmax(0,1fr))] md:min-w-[800px]`}>
        {/* Header row */}
        <div className="sticky top-0 z-20 bg-white border-r border-b border-gray-200 p-2 text-xs font-medium text-gray-500 text-center">
          Time
        </div>
        {visibleDays.map(day => (
          <div 
            key={day.toISOString()} 
            className="sticky top-0 z-20 bg-white border-b border-gray-200 p-2 text-center"
          >
            <div className="text-xs font-medium text-gray-500">{formatWeekdayHeader(day)}</div>
            <div className={`text-lg font-semibold ${isSameDay(day, new Date()) ? 'text-blue-600' : 'text-gray-900'}`}>
              {formatDateHeader(day)}
            </div>
          </div>
        ))}

        {/* Time slots grid */}
        {timeSlots.map(slot => (
          <React.Fragment key={`${slot.hour}-${slot.minute}`}>
            <div className="border-r border-gray-200 p-2 text-xs text-right text-gray-500 h-8 flex items-center justify-end"> 
              <span>{slot.minute === 0 ? slot.formatted : ''}</span>
            </div>

            {visibleDays.map(day => {
              const itemsInSlot = getItemsForTimeSlot(day, slot, tasks, googleEvents);
              const isToday = isSameDay(day, currentTime);
              const currentHour = currentTime.getHours();
              const currentMinute = currentTime.getMinutes();
              
              const isCurrentTimeInThisSlot = 
                isToday &&
                slot.hour === currentHour && 
                currentMinute >= slot.minute && 
                currentMinute < slot.minute + 30;

              const minuteOffsetInSlot = isCurrentTimeInThisSlot
                ? ((currentMinute - slot.minute) / 30) * 100
                : 0;

              return (
                <div
                  key={day.toISOString() + slot.formatted}
                  className={`border-b border-r border-gray-100 h-8 relative cursor-pointer transition-colors ${
                    dragState.dragOverSlot === `${day.toISOString()}-${slot.hour}-${slot.minute}-0` || 
                    dragState.dragOverSlot === `${day.toISOString()}-${slot.hour}-${slot.minute}-15` ? 'bg-blue-100' : ''
                  }`}
                  onClick={(e) => onTimeSlotClick(day, slot, e)}
                  onDragOver={(e) => handleDragOver(e, e.currentTarget)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, e.currentTarget, day)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={(e) => {
                    const elementsAtPoint = document.elementsFromPoint(
                      e.changedTouches[0].clientX,
                      e.changedTouches[0].clientY
                    );
                    const timeSlotElement = elementsAtPoint.find(el => 
                      el.hasAttribute('data-hour')
                    ) as HTMLElement;
                    handleTouchEnd(e, timeSlotElement);
                  }}
                  data-hour={slot.hour}
                  data-minute={slot.minute}
                  data-date={day.toISOString()}
                >
                  {/* Split the slot into two 15-minute sections */}
                  <div 
                    className={`absolute top-0 left-0 right-0 h-1/2 hover:bg-blue-50 transition-colors ${
                      dragState.dragOverSlot === `${day.toISOString()}-${slot.hour}-${slot.minute}-0` ? 'bg-blue-100' : ''
                    }`}
                  />
                  <div 
                    className={`absolute bottom-0 left-0 right-0 h-1/2 hover:bg-blue-50 transition-colors ${
                      dragState.dragOverSlot === `${day.toISOString()}-${slot.hour}-${slot.minute}-15` ? 'bg-blue-100' : ''
                    }`}
                  />

                  <CurrentTimeLine
                    isCurrentTimeInThisSlot={isCurrentTimeInThisSlot}
                    minuteOffsetInSlot={minuteOffsetInSlot}
                  />

                  {itemsInSlot.map((item, index) => {
                    const isGoogleEvent = 'summary' in item;
                    const googleEventCount = itemsInSlot.filter(i => 'summary' in i).length;
                    const taskEventCount = itemsInSlot.length - googleEventCount;
                    
                    try {
                      const timing = calculateItemTiming(item);
                      const position = calculateItemPosition(item, index, itemsInSlot, googleEventCount, taskEventCount);
                      
                      // Calculate top offset and height based on timing
                      const slotStartMinutes = slot.hour * 60 + slot.minute;
                      const itemStartMinutes = timing.startHour * 60 + timing.startMinute;
                      const topOffset = Math.max(0, ((itemStartMinutes - slotStartMinutes) / 30) * 100);
                      const heightPercent = Math.min(100 - topOffset, (timing.durationInMinutes / 30) * 100);

                      if (isGoogleEvent) {
                        return (
                          <EventItem
                            key={item.id}
                            event={item}
                            onClick={onGoogleEventClick}
                            defaultGcalColor={defaultGcalColor}
                            externalMeetingColor={externalMeetingColor}
                            width={position.width}
                            left={position.left}
                            topPercent={topOffset}
                            heightPercent={heightPercent}
                          />
                        );
                      } else {
                        return (
                          <TaskItem
                            key={item.id}
                            task={item}
                            onClick={onTaskClick}
                            onDragStart={handleDragStart}
                            onTouchStart={handleTouchStart}
                            width={position.width}
                            left={position.left}
                            topPercent={topOffset}
                            heightPercent={heightPercent}
                          />
                        );
                      }
                    } catch (error) {
                      console.error("Error rendering calendar item:", error);
                      return null;
                    }
                  })}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
} 