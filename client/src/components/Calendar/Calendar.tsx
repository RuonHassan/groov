import React, { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO, getHours, getMinutes, getDay } from 'date-fns';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Task } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useWeek } from "@/contexts/WeekContext";
import { supabase } from "@/lib/supabaseClient";
import AddTaskModal from '../AddTaskModal';
import GoogleEventModal from '../GoogleEventModal';
import { useGoogleCalendar } from '@/contexts/GoogleCalendarContext';
import { useAuth } from "@/contexts/AuthContext";
import { useTaskContext } from "@/contexts/TaskContext";

// Import utilities
import { TimeSlot, GoogleEvent } from './utils/types';
import { 
  CALENDAR_START_HOUR, 
  CALENDAR_END_HOUR, 
  TOTAL_CALENDAR_MINUTES, 
  generateTimeSlots, 
  roundToNearest15Minutes, 
  isItemInTimeSlot 
} from './utils/timeUtils';
import { 
  hasExternalAttendees, 
  calculateTaskPosition, 
  isLightColor 
} from './utils/eventUtils';

const timeSlots = generateTimeSlots();

// Props: Only needs tasks now
interface CalendarProps {
  tasks: Task[];
  onRefetch?: () => void;
  scheduledTaskId?: number | null;
}

export default function Calendar({ tasks, onRefetch, scheduledTaskId }: CalendarProps) {
  const { currentDate, goToPreviousWeek, goToNextWeek } = useWeek();
  const { toast } = useToast();
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<GoogleEvent | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultTaskTimes, setDefaultTaskTimes] = useState<{ start_time: string | null; end_time: string | null }>({ start_time: null, end_time: null });
  const { isConnected, calendars, fetchEvents } = useGoogleCalendar();
  const [googleEvents, setGoogleEvents] = useState<GoogleEvent[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date()); // State for current time
  const [mobileViewOffset, setMobileViewOffset] = useState<'early' | 'late'>('early'); // 'early' for Mon-Wed, 'late' for Wed-Fri
  const { user } = useAuth();
  const [defaultGcalColor, setDefaultGcalColor] = useState("#B1C29E");
  const [externalMeetingColor, setExternalMeetingColor] = useState("#F4A261");
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const { updateTask } = useTaskContext();
  const [touchDragTask, setTouchDragTask] = useState<Task | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [longPressTimeout, setLongPressTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragGhost, setDragGhost] = useState<HTMLElement | null>(null);
  const [dragGhostPosition, setDragGhostPosition] = useState<{ x: number; y: number } | null>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); 
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const allWeekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  
  // Get visible days based on screen size and current view
  const getVisibleDays = () => {
    // On desktop, show all weekdays (Mon-Fri)
    if (window.innerWidth >= 768) {
      return allWeekDays.filter(day => {
        const dayOfWeek = getDay(day);
        return dayOfWeek !== 0 && dayOfWeek !== 6; // Exclude Sunday (0) and Saturday (6)
      });
    }
    
    // On mobile, show 3 days based on the current view offset
    return mobileViewOffset === 'early' ? allWeekDays.slice(0, 3) : allWeekDays.slice(2, 5);
  };

  // Mobile navigation functions
  const goToPreviousThreeDays = () => {
    if (mobileViewOffset === 'late') {
      // If showing Wed-Fri, go back to Mon-Wed of the same week
      setMobileViewOffset('early');
    } else {
      // If showing Mon-Wed, go to Wed-Fri of the previous week
      goToPreviousWeek();
      setMobileViewOffset('late');
    }
  };

  const goToNextThreeDays = () => {
    if (mobileViewOffset === 'early') {
      // If showing Mon-Wed, go to Wed-Fri of the same week
      setMobileViewOffset('late');
    } else {
      // If showing Wed-Fri, go to Mon-Wed of the next week
      goToNextWeek();
      setMobileViewOffset('early');
    }
  };

  const [visibleDays, setVisibleDays] = useState(getVisibleDays());

  // Update visible days when window is resized, date changes, or view offset changes
  useEffect(() => {
    const handleResize = () => {
      setVisibleDays(getVisibleDays());
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call

    return () => window.removeEventListener('resize', handleResize);
  }, [currentDate, mobileViewOffset]); // Re-run when date or view offset changes

  // Set initial mobile view offset based on current day
  useEffect(() => {
    const currentDayOfWeek = getDay(currentDate);
    setMobileViewOffset(currentDayOfWeek >= 3 && currentDayOfWeek <= 5 ? 'late' : 'early');
  }, []);

  // Effect to update current time every minute
  useEffect(() => {
    const timerId = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every 60 seconds

    return () => clearInterval(timerId); // Cleanup interval on unmount
  }, []);

  // Fetch Google Calendar events when the week changes
  useEffect(() => {
    // Create a stable reference to weekStart and weekEnd
    const startDate = weekStart;
    const endDate = weekEnd;

    const fetchGoogleEvents = async () => {
      if (!isConnected || calendars.length === 0) {
        console.log('Not fetching events: isConnected =', isConnected, 'calendars =', calendars);
        return;
      }

      try {
        console.log('Fetching events for calendars:', calendars);
        const allEvents = await Promise.all(
          calendars.map(calendar => {
            console.log('Fetching events for calendar:', calendar);
            return fetchEvents(calendar.calendar_id, startDate, endDate);
          })
        );

        // Flatten and deduplicate events
        const events = Array.from(new Set(allEvents.flat()));
        console.log('Fetched events:', events);
        setGoogleEvents(events);
      } catch (error) {
        console.error('Error fetching Google Calendar events:', error);
        toast({
          title: "Calendar Error",
          description: "Could not fetch Google Calendar events",
          variant: "destructive",
        });
      }
    };

    fetchGoogleEvents();
  }, [isConnected, calendars, currentDate]);

  // Fetch user's default colors
  useEffect(() => {
    const fetchDefaultColors = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('users')
          .select('default_gcal_color, external_meeting_color')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        if (data) {
          if (data.default_gcal_color) {
            setDefaultGcalColor(data.default_gcal_color);
          }
          if (data.external_meeting_color) {
            setExternalMeetingColor(data.external_meeting_color);
          }
        }
      } catch (error) {
        console.error('Error fetching default colors:', error);
      }
    };

    fetchDefaultColors();
  }, [user?.id]);

  const formatWeekdayHeader = (date: Date) => format(date, 'EEE');
  const formatDateHeader = (date: Date) => format(date, 'd');

  const getItemsForTimeSlot = (date: Date, timeSlot: TimeSlot) => {
    const tasksInSlot = tasks.filter(task =>
      task.start_time &&
      task.end_time &&
      isItemInTimeSlot(task.start_time, task.end_time, date, timeSlot)
    );

    const eventsInSlot = googleEvents.filter(event => {
      // Use dateTime if present, otherwise fall back to all-day date
      const rawStart = event.start.dateTime ?? event.start.date;
      const rawEnd   = event.end.dateTime   ?? event.end.date;

      // Only include if we have both start and end strings
      if (!rawStart || !rawEnd) {
        return false;
      }

      return isItemInTimeSlot(rawStart, rawEnd, date, timeSlot);
    });

    return [...tasksInSlot, ...eventsInSlot];
  };

  // Handle click on a time slot to CREATE a new task
  const handleTimeSlotClick = (date: Date, slot: TimeSlot, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const isTopHalf = relativeY < rect.height / 2;

    const startTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), slot.hour, slot.minute + (isTopHalf ? 0 : 15));
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); 

    // Set default times for the modal
    setDefaultTaskTimes({
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString()
    });
    setEditingTask(null); // Ensure we are creating a new task
    setShowTaskModal(true); // Open the AddTaskModal
  };

  // Handle click on a TASK item on the calendar to EDIT it
  const handleTaskClick = (task: Task) => {
    setEditingTask(task); // Set the task to be edited
    setDefaultTaskTimes({ start_time: null, end_time: null }); // Clear default times
    setShowTaskModal(true); // Open the AddTaskModal
  };

  // Get color based on task's color property rather than status
  const getTaskColor = (task: Task): string => {
    // Use task color directly or default to blue
    return task.color || '#3b82f6';
  };

  // Handle click on a Google Calendar event
  const handleGoogleEventClick = (event: GoogleEvent) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  // Create and manage drag ghost element
  const createDragGhost = (task: Task, color: string, x: number, y: number) => {
    removeDragGhost(); // Clean up any existing ghost

    const ghost = document.createElement('div');
    ghost.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      transform: translate(${x}px, ${y}px);
      width: 200px;
      height: 32px;
      background-color: ${color};
      color: ${isLightColor(color) ? '#111' : '#fff'};
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      opacity: 0.9;
      pointer-events: none;
      z-index: 9999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      font-family: system-ui, -apple-system, sans-serif;
      will-change: transform;
      -webkit-transform: translate(${x}px, ${y}px);
      -webkit-backface-visibility: hidden;
    `;
    ghost.textContent = task.title;
    document.body.appendChild(ghost);
    setDragGhost(ghost);
    setDragGhostPosition({ x, y });
  };

  const updateDragGhostPosition = (x: number, y: number) => {
    if (dragGhost && dragGhostPosition) {
      dragGhost.style.transform = `translate(${x}px, ${y}px)`;
      dragGhost.style.webkitTransform = `translate(${x}px, ${y}px)`;
      setDragGhostPosition({ x, y });
    }
  };

  const removeDragGhost = () => {
    if (dragGhost) {
      dragGhost.remove();
      setDragGhost(null);
      setDragGhostPosition(null);
    }
  };

  // Handle long press to start dragging
  const handleTouchStart = (e: React.TouchEvent, task: Task, color: string) => {
    if (task.completed_at) return;
    e.preventDefault();
    e.stopPropagation();
    
    const touch = e.touches[0];
    setTouchStartY(touch.pageY);
    
    const timer = setTimeout(() => {
      setTouchDragTask(task);
      setIsDragging(true);
      
      // Add visual feedback to original task
      const element = e.currentTarget as HTMLElement;
      element.style.opacity = '0.5';

      // Create ghost at touch position with offset to be visible above finger
      createDragGhost(
        task,
        color,
        touch.pageX,
        touch.pageY - 50 // Offset upward to be visible above finger
      );
    }, 500);

    setLongPressTimeout(timer);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchDragTask || !isDragging) return;
    e.preventDefault();
    e.stopPropagation();

    const touch = e.touches[0];
    
    // Update ghost position with the same upward offset
    updateDragGhostPosition(touch.pageX, touch.pageY - 50);

    // Handle time slot highlighting
    const elementsAtPoint = document.elementsFromPoint(touch.clientX, touch.clientY);
    const timeSlotElement = elementsAtPoint.find(el => el.hasAttribute('data-hour')) as HTMLElement;

    if (timeSlotElement) {
      const rect = timeSlotElement.getBoundingClientRect();
      const relativeY = touch.clientY - rect.top;
      const isTopHalf = relativeY < rect.height / 2;
      const hour = parseInt(timeSlotElement.dataset.hour || "0");
      const minute = parseInt(timeSlotElement.dataset.minute || "0");
      const day = new Date(timeSlotElement.dataset.date || "");

      setDragOverSlot(`${day.toISOString()}-${hour}-${minute}-${isTopHalf ? '0' : '15'}`);
    }
  };

  const handleTouchEnd = async (e: React.TouchEvent) => {
    if (longPressTimeout) {
      clearTimeout(longPressTimeout);
      setLongPressTimeout(null);
    }

    removeDragGhost();

    if (!touchDragTask || !isDragging) return;

    const touch = e.changedTouches[0];
    const elementsAtPoint = document.elementsFromPoint(touch.clientX, touch.clientY);
    const timeSlotElement = elementsAtPoint.find(el => el.hasAttribute('data-hour')) as HTMLElement;

    if (timeSlotElement) {
      const hour = parseInt(timeSlotElement.dataset.hour || "0");
      const minute = parseInt(timeSlotElement.dataset.minute || "0");
      const day = new Date(timeSlotElement.dataset.date || "");
      const rect = timeSlotElement.getBoundingClientRect();
      const relativeY = touch.clientY - rect.top;
      const isTopHalf = relativeY < rect.height / 2;

      const startTime = new Date(day);
      startTime.setHours(hour, minute + (isTopHalf ? 0 : 15));

      // Calculate the original duration
      const originalStart = parseISO(touchDragTask.start_time!);
      const originalEnd = parseISO(touchDragTask.end_time!);
      const durationInMinutes = (originalEnd.getTime() - originalStart.getTime()) / (1000 * 60);

      // Create end time by adding the original duration
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + durationInMinutes);

      try {
        await updateTask(touchDragTask.id, {
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString()
        });

        toast({
          title: "Task rescheduled",
          description: `"${touchDragTask.title}" has been moved to ${format(startTime, 'h:mm a')}`
        });
        if (onRefetch) onRefetch();
      } catch (error) {
        console.error("Failed to update task:", error);
        toast({
          title: "Error",
          description: "Failed to reschedule task",
          variant: "destructive"
        });
      }
    }

    // Reset the dragged element's opacity
    const taskCards = document.querySelectorAll('.task-card');
    taskCards.forEach((el: Element) => {
      (el as HTMLElement).style.opacity = '1';
    });

    setTouchDragTask(null);
    setTouchStartY(null);
    setIsDragging(false);
    setDragOverSlot(null);
  };

  // Clean up on unmount or when drag is cancelled
  useEffect(() => {
    return () => {
      if (longPressTimeout) {
        clearTimeout(longPressTimeout);
      }
      removeDragGhost();
    };
  }, []);

  // Cancel drag on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (touchDragTask) {
        removeDragGhost();
        setTouchDragTask(null);
        setIsDragging(false);
        setDragOverSlot(null);
        
        // Reset opacity of all task cards
        const taskCards = document.querySelectorAll('.task-card');
        taskCards.forEach((el: Element) => {
          (el as HTMLElement).style.opacity = '1';
        });
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      removeDragGhost();
    };
  }, [touchDragTask]);

  return (
    <div className="w-full flex flex-col">
      {/* Calendar header with navigation */}
      <div className="flex items-center justify-between p-2 relative">
        <span className="font-semibold text-xl">
          {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
        </span>
        <div className="md:hidden flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={goToPreviousThreeDays}
            className="p-1"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={goToNextThreeDays}
            className="p-1"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <div className="mx-1 h-[2.5px] bg-gray-800 rounded-full" />
        </div>
      </div>
      
      <div className="border-t border-gray-200 overflow-x-hidden">
        <div className={`grid md:grid-cols-[auto_repeat(5,minmax(0,1fr))] grid-cols-[auto_repeat(3,minmax(0,1fr))] md:min-w-[800px]`}>
          <div className="sticky top-0 z-20 bg-white border-r border-b border-gray-200 p-2 text-xs font-medium text-gray-500 text-center">Time</div>
          {visibleDays.map(day => (
              <div 
                  key={day.toISOString()} 
                  className="sticky top-0 z-20 bg-white border-b border-gray-200 p-2 text-center">
                <div className="text-xs font-medium text-gray-500">{formatWeekdayHeader(day)}</div>
                <div className={`text-lg font-semibold ${isSameDay(day, new Date()) ? 'text-blue-600' : 'text-gray-900'}`}>
                  {formatDateHeader(day)}
                </div>
              </div>
          ))}

          {timeSlots.map(slot => (
            <React.Fragment key={`${slot.hour}-${slot.minute}`}>
              <div className="border-r border-gray-200 p-2 text-xs text-right text-gray-500 h-8 flex items-center justify-end"> 
                <span>{slot.minute === 0 ? slot.formatted : ''}</span>
              </div>

              {visibleDays.map(day => {
                const itemsInSlot = getItemsForTimeSlot(day, slot);
                const isToday = isSameDay(day, currentTime);
                const currentHour = getHours(currentTime);
                const currentMinute = getMinutes(currentTime);
                
                const isCurrentTimeInThisSlot = 
                  isToday &&
                  slot.hour === currentHour && 
                  currentMinute >= slot.minute && 
                  currentMinute < slot.minute + 30;

                let timeIndicator = null;
                if (isCurrentTimeInThisSlot) {
                  const minuteOffsetInSlot = ((currentMinute - slot.minute) / 30) * 100;
                  timeIndicator = (
                    <div 
                      className="absolute left-0 right-0 h-[3px] bg-red-500 z-30 pointer-events-none"
                      style={{ top: `${minuteOffsetInSlot}%` }} 
                    />
                  );
                }
                
                return (
                  <div
                    key={day.toISOString() + slot.formatted}
                    className={`border-b border-r border-gray-100 h-8 relative cursor-pointer transition-colors ${
                      dragOverSlot === `${day.toISOString()}-${slot.hour}-${slot.minute}-0` || 
                      dragOverSlot === `${day.toISOString()}-${slot.hour}-${slot.minute}-15` ? 'bg-blue-100' : ''
                    }`}
                    onClick={(e) => handleTimeSlotClick(day, slot, e)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const relativeY = e.clientY - rect.top;
                      const isTopHalf = relativeY < rect.height / 2;
                      setDragOverSlot(`${day.toISOString()}-${slot.hour}-${slot.minute}-${isTopHalf ? '0' : '15'}`);
                    }}
                    onDragLeave={() => setDragOverSlot(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverSlot(null);
                      if (!draggedTask) return;

                      const newTimes = calculateTaskPosition(e.nativeEvent, e.currentTarget, day, draggedTask);
                      if (!newTimes) return;

                      // Update the task with new times
                      updateTask(draggedTask.id, {
                        start_time: newTimes.startTime.toISOString(),
                        end_time: newTimes.endTime.toISOString()
                      }).then(() => {
                        toast({
                          title: "Task rescheduled",
                          description: `"${draggedTask.title}" has been moved to ${format(newTimes.startTime, 'h:mm a')}`
                        });
                        if (onRefetch) onRefetch();
                      }).catch((error) => {
                        console.error("Failed to update task:", error);
                        toast({
                          title: "Error",
                          description: "Failed to reschedule task",
                          variant: "destructive"
                        });
                      });

                      setDraggedTask(null);
                    }}
                    data-hour={slot.hour}
                    data-minute={slot.minute}
                    data-date={day.toISOString()}
                  >
                    {/* Split the slot into two 15-minute sections */}
                    <div 
                      className={`absolute top-0 left-0 right-0 h-1/2 hover:bg-blue-50 transition-colors ${
                        dragOverSlot === `${day.toISOString()}-${slot.hour}-${slot.minute}-0` ? 'bg-blue-100' : ''
                      }`}
                    />
                    <div 
                      className={`absolute bottom-0 left-0 right-0 h-1/2 hover:bg-blue-50 transition-colors ${
                        dragOverSlot === `${day.toISOString()}-${slot.hour}-${slot.minute}-15` ? 'bg-blue-100' : ''
                      }`}
                    />
                    {timeIndicator}
                    {itemsInSlot.map((item, index, array) => {
                      const isGoogleEvent = 'summary' in item;
                      const title = isGoogleEvent ? item.summary : item.title;
                      const rawStart = isGoogleEvent
                        ? (item.start.dateTime ?? item.start.date ?? '')
                        : item.start_time!;
                      const rawEnd   = isGoogleEvent
                        ? (item.end.dateTime   ?? item.end.date   ?? '')
                        : item.end_time!;
                      if (!rawStart || !rawEnd) {
                        return null;
                      }
                      
                      const startDate = parseISO(rawStart);
                      const endDate   = parseISO(rawEnd);
                      const isCompleted = !isGoogleEvent && !!item.completed_at;

                      const startMinute = getMinutes(startDate);
                      const startHour = getHours(startDate);
                      const durationInMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
                      
                      const topPercent = (startMinute % 30) / 30 * 100;
                      const heightPercent = (durationInMinutes / 30) * 100;

                      if (startHour !== slot.hour || Math.floor(startMinute / 30) * 30 !== slot.minute) {
                        return null;
                      }

                      let taskClasses = "absolute rounded p-1 text-xs overflow-hidden z-10 shadow-sm transition-colors duration-150 ease-in-out";

                      // Add smaller text class for 15-minute tasks
                      if (durationInMinutes <= 15) {
                        taskClasses += " text-[10px] leading-[10px] p-[2px]";
                      }

                      if (isCompleted) {
                        taskClasses += " bg-gray-200 text-gray-500 border border-gray-200 cursor-default";
                      } else {
                        const bgColor = isGoogleEvent ? 
                          hasExternalAttendees(item as GoogleEvent) ? externalMeetingColor : defaultGcalColor 
                          : item.color || '#3b82f6';
                        const textColor = isLightColor(bgColor) ? 'text-gray-900' : 'text-white';
                        taskClasses += ` ${textColor} hover:opacity-90 ${isGoogleEvent ? 'cursor-default' : 'cursor-pointer'}`;
                      }

                      const googleEventCount = array.filter(i => 'summary' in i).length;
                      const taskEventCount = array.length - googleEventCount;
                      
                      let width, left;
                      
                      if (googleEventCount > 0 && taskEventCount > 0) {
                        width = 48 / (isGoogleEvent ? googleEventCount : taskEventCount);
                        const groupIndex = isGoogleEvent 
                          ? array.filter(i => 'summary' in i).indexOf(item)
                          : array.filter(i => !('summary' in i)).indexOf(item);
                        left = isGoogleEvent 
                          ? 1 + (groupIndex * width)
                          : 51 + (groupIndex * width);
                      } else {
                        width = (98 / array.length);
                        left = 1 + (index * width);
                      }

                      const bgColor = isCompleted ? undefined : (isGoogleEvent ? 
                        hasExternalAttendees(item as GoogleEvent) ? externalMeetingColor : defaultGcalColor 
                        : item.color || '#3b82f6');

                      return (
                        <div
                          key={isGoogleEvent ? item.id : item.id.toString()}
                          className={`${taskClasses} task-card select-none`}
                          style={{
                            top: `${topPercent}%`,
                            height: `${Math.max(heightPercent, 5)}%`,
                            backgroundColor: bgColor,
                            borderColor: bgColor,
                            width: `calc(${width}% - 2px)`,
                            left: `${left}%`,
                            right: 'auto',
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            touchAction: 'none',
                            WebkitTouchCallout: 'none', // Prevent iOS callout
                            WebkitUserSelect: 'none', // Prevent text selection
                            userSelect: 'none', // Prevent text selection
                            opacity: isCompleted ? '0.6' : '0.9', // Add opacity to all events, with completed tasks being more transparent
                          }}
                          draggable={!isGoogleEvent && !isCompleted}
                          onTouchStart={(e) => !isGoogleEvent && handleTouchStart(e, item as Task, bgColor || '#3b82f6')}
                          onTouchMove={handleTouchMove}
                          onTouchEnd={handleTouchEnd}
                          onDragStart={(e) => {
                            if (isGoogleEvent) return;
                            e.stopPropagation();
                            setDraggedTask(item as Task);

                            // Clone the current element for the drag image
                            const originalElement = e.currentTarget;
                            const dragImage = originalElement.cloneNode(true) as HTMLElement;
                            
                            // Set up the ghost image container with fixed dimensions
                            dragImage.style.position = 'absolute';
                            dragImage.style.top = '-1000px';
                            dragImage.style.width = '200px'; // Fixed width to match task card
                            dragImage.style.height = '32px'; // Fixed height to match time slot
                            dragImage.style.backgroundColor = bgColor || '#3b82f6';
                            dragImage.style.borderRadius = '4px';
                            dragImage.style.padding = '4px 8px';
                            dragImage.style.opacity = '0.9';
                            dragImage.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                            dragImage.style.pointerEvents = 'none';
                            dragImage.style.transform = 'none';
                            dragImage.style.left = '0';
                            
                            document.body.appendChild(dragImage);
                            e.dataTransfer.setDragImage(dragImage, 100, 16); // Center horizontally and vertically
                            setTimeout(() => document.body.removeChild(dragImage), 0);
                          }}
                          onDragEnd={() => {
                            if (isGoogleEvent) return;
                            setDraggedTask(null);
                            setDragOverSlot(null);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isGoogleEvent) {
                              handleGoogleEventClick(item as GoogleEvent);
                            } else if (!isCompleted) {
                              handleTaskClick(item as Task);
                            }
                          }}
                        >
                          <p className="font-medium truncate">
                            {title}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Task and event modals */}
      <AddTaskModal 
        open={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setEditingTask(null);
          setDefaultTaskTimes({ start_time: null, end_time: null });
        }}
        task={editingTask ?? undefined}
        isEditing={!!editingTask}
        defaultStartTime={editingTask ? undefined : defaultTaskTimes.start_time}
        defaultEndTime={editingTask ? undefined : defaultTaskTimes.end_time}
      />

      {showEventModal && selectedEvent && (
        <GoogleEventModal
          open={showEventModal}
          onClose={() => {
            setShowEventModal(false);
            setSelectedEvent(null);
          }}
          event={selectedEvent}
        />
      )}
    </div>
  );
} 