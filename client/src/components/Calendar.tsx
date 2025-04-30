import React, { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO, isWithinInterval, isValid, getHours, getMinutes, getDay, addWeeks, subWeeks } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Task } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useWeek } from "@/contexts/WeekContext";
import { supabase } from "@/lib/supabaseClient";
import AddTaskModal from './AddTaskModal';
import GoogleEventModal from './GoogleEventModal';
import { useGoogleCalendar } from '@/contexts/GoogleCalendarContext';

// Current time indicator calculation constants
const CALENDAR_START_HOUR = 8;
const CALENDAR_END_HOUR = 19; // Extended to 7 PM to include the last slot
const TOTAL_CALENDAR_MINUTES = (CALENDAR_END_HOUR - CALENDAR_START_HOUR) * 60;

// Time slot definition
interface TimeSlot {
  hour: number;
  minute: number;
  formatted: string;
}

interface GoogleEvent {
  id: string;
  summary: string;
  start: { dateTime: string };
  end: { dateTime: string };
  colorId?: string;
}

// Generate time slots from 8 AM to 6 PM
function generateTimeSlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let hour = CALENDAR_START_HOUR; hour < CALENDAR_END_HOUR; hour++) {
    // Add the hour slot (XX:00)
    slots.push({
      hour,
      minute: 0,
      formatted: format(new Date().setHours(hour, 0), 'h:mm a')
    });
    
    // Add the half-hour slot (XX:30)
    slots.push({
      hour,
      minute: 30,
      formatted: format(new Date().setHours(hour, 30), 'h:mm a')
    });
  }
  return slots;
}

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
  const [mobileOffset, setMobileOffset] = useState(0); // 0 for Mon-Wed, 1 for Wed-Fri

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); 
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const allWeekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  
  // Get visible days based on screen size and mobile offset
  const getVisibleDays = () => {
    // On desktop, show all weekdays (Mon-Fri)
    if (window.innerWidth >= 768) {
      return allWeekDays.filter(day => {
        const dayOfWeek = getDay(day);
        return dayOfWeek !== 0 && dayOfWeek !== 6; // Exclude Sunday (0) and Saturday (6)
      });
    }
    
    // On mobile, show 3 days based on offset
    // Using fixed ranges: Mon-Wed or Wed-Fri
    if (mobileOffset === 0) {
      return allWeekDays.slice(0, 3); // Mon, Tue, Wed
    } else {
      return allWeekDays.slice(2, 5); // Wed, Thu, Fri
    }
  };

  // Mobile navigation functions
  const goToPreviousThreeDays = () => {
    // If we're showing Wed-Fri, go back to Mon-Wed of the same week
    if (mobileOffset === 1) {
      setMobileOffset(0);
    } 
    // If we're showing Mon-Wed, go to Wed-Fri of the previous week
    else {
      goToPreviousWeek();
      setMobileOffset(1);
    }
  };

  const goToNextThreeDays = () => {
    // If we're showing Mon-Wed, go to Wed-Fri of the same week
    if (mobileOffset === 0) {
      setMobileOffset(1);
    } 
    // If we're showing Wed-Fri, go to Mon-Wed of the next week
    else {
      goToNextWeek();
      setMobileOffset(0);
    }
  };

  const [visibleDays, setVisibleDays] = useState(getVisibleDays());

  // Update visible days when window is resized, date changes, or mobile offset changes
  useEffect(() => {
    const handleResize = () => {
      setVisibleDays(getVisibleDays());
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call

    return () => window.removeEventListener('resize', handleResize);
  }, [currentDate, mobileOffset]); // Re-run when date or mobile offset changes

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
  }, [isConnected, calendars, currentDate]); // Only depend on isConnected, calendars, and currentDate

  const formatWeekdayHeader = (date: Date) => format(date, 'EEE');
  const formatDateHeader = (date: Date) => format(date, 'd');

  // Check if a task or event overlaps with a specific time slot
  const isItemInTimeSlot = (startTime: string | null, endTime: string | null, date: Date, timeSlot: TimeSlot): boolean => {
    if (!startTime || !endTime) return false;
    
    try {
      const itemStart = parseISO(startTime);
      const itemEnd = parseISO(endTime);
      if (!isValid(itemStart) || !isValid(itemEnd)) return false;

      const slotStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), timeSlot.hour, timeSlot.minute);
      const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000); // 30 minutes instead of 60

      return itemStart < slotEnd && itemEnd > slotStart;
    } catch (e) {
      console.error("Error parsing dates:", e);
      return false;
    }
  };

  // Calculate the vertical offset for the current time indicator
  const calculateTopOffset = (now: Date): number => {
    const currentHour = getHours(now);
    const currentMinute = getMinutes(now);

    // Ensure time is within calendar bounds
    if (currentHour < CALENDAR_START_HOUR || currentHour >= CALENDAR_END_HOUR) {
      return -1; // Indicate it's outside the displayed range
    }

    const minutesFromStart = (currentHour - CALENDAR_START_HOUR) * 60 + currentMinute;
    const offsetPercent = (minutesFromStart / TOTAL_CALENDAR_MINUTES) * 100;
    
    return Math.max(0, Math.min(100, offsetPercent)); // Clamp between 0% and 100%
  };

  // Get tasks and events that start within a specific day and time slot
  const getItemsForTimeSlot = (date: Date, timeSlot: TimeSlot) => {
    const tasksInSlot = tasks.filter(task => 
      task.start_time && task.end_time && isItemInTimeSlot(task.start_time, task.end_time, date, timeSlot)
    );

    const eventsInSlot = googleEvents.filter(event => 
      event.start?.dateTime && event.end?.dateTime && isItemInTimeSlot(event.start.dateTime, event.end.dateTime, date, timeSlot)
    );

    return [...tasksInSlot, ...eventsInSlot];
  };

  // Handle click on a time slot to CREATE a new task
  const handleTimeSlotClick = (date: Date, slot: TimeSlot) => {
    const startTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), slot.hour, slot.minute);
    // Default to 30 minute duration (was 60)
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

  // Helper function to check if a color is light
  const isLightColor = (color: string): boolean => {
    const c = color.substring(1);
    const rgb = parseInt(c, 16);
    const luma = (rgb >> 16) * 0.299 + (rgb >> 8 & 255) * 0.587 + (rgb & 255) * 0.114;
    return luma > 128;
  };

  // Handle click on a Google Calendar event
  const handleGoogleEventClick = (event: GoogleEvent) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

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
                    className="border-b border-r border-gray-100 h-8 relative cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={() => handleTimeSlotClick(day, slot)}
                  >
                    {timeIndicator}

                    {itemsInSlot.map((item, index, array) => {
                      const isGoogleEvent = 'summary' in item;
                      const title = isGoogleEvent ? item.summary : item.title;
                      const start = isGoogleEvent ? item.start.dateTime : item.start_time!;
                      const end = isGoogleEvent ? item.end.dateTime : item.end_time!;
                      const startDate = parseISO(start);
                      const endDate = parseISO(end);
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

                      if (isCompleted) {
                        taskClasses += " bg-gray-200 text-gray-500 border border-gray-200 cursor-default";
                      } else {
                        const bgColor = isGoogleEvent ? '#B1C29E' : (item.color || '#3b82f6');
                        const textColor = isLightColor(bgColor) ? 'text-gray-900' : 'text-white';
                        taskClasses += ` ${textColor} hover:opacity-90 ${isGoogleEvent ? 'cursor-default' : 'cursor-pointer'}`;
                        
                        if (isGoogleEvent) {
                          taskClasses += " border border-[#B1C29E]";
                        }
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

                      return (
                        <div
                          key={isGoogleEvent ? item.id : item.id.toString()}
                          className={taskClasses}
                          style={{
                            top: `${topPercent}%`,
                            height: `${Math.max(heightPercent, 5)}%`,
                            backgroundColor: isCompleted ? undefined : (isGoogleEvent ? '#B1C29E' : item.color || '#3b82f6'),
                            width: `calc(${width}% - 2px)`,
                            left: `${left}%`,
                            right: 'auto'
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