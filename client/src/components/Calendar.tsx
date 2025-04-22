import React, { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO, isWithinInterval, isValid, getHours, getMinutes, getDay } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Task } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useWeek } from "@/contexts/WeekContext";
import { supabase } from "@/lib/supabaseClient";
import AddTaskModal from './AddTaskModal';
import GoogleEventModal from './GoogleEventModal';
import { useGoogleCalendar } from '@/contexts/GoogleCalendarContext';

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
  for (let hour = 8; hour <= 18; hour++) {
    slots.push({
      hour,
      minute: 0,
      formatted: format(new Date().setHours(hour, 0), 'h:mm a')
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
  const { currentDate } = useWeek();
  const { toast } = useToast();
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<GoogleEvent | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultTaskTimes, setDefaultTaskTimes] = useState<{ start_time: string | null; end_time: string | null }>({ start_time: null, end_time: null });
  const { isConnected, calendars, fetchEvents } = useGoogleCalendar();
  const [googleEvents, setGoogleEvents] = useState<GoogleEvent[]>([]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); 
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

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

  const allWeekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  const weekDays = allWeekDays.filter(day => {
      const dayOfWeek = getDay(day);
      return dayOfWeek !== 0 && dayOfWeek !== 6; // Exclude Sunday (0) and Saturday (6)
  });

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
      const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);

      return itemStart < slotEnd && itemEnd > slotStart;
    } catch (e) {
      console.error("Error parsing dates:", e);
      return false;
    }
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
    <div className="flex flex-col">
      <div className="flex items-center justify-between p-2 relative">
        <span className="font-semibold text-xl">
          {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
        </span>
        <div className="absolute bottom-0 left-0 right-0">
          <div className="mx-1 h-[2.5px] bg-gray-800 rounded-full" />
        </div>
      </div>
      
      <div className="border-t border-gray-200">
        <div className="grid grid-cols-[auto_repeat(5,minmax(0,1fr))] min-w-[800px]">
          <div className="sticky top-0 z-20 bg-white border-r border-b border-gray-200 p-2 text-xs font-medium text-gray-500 text-center">Time</div>
          {weekDays.map(day => (
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
            <React.Fragment key={slot.formatted}>
              <div className="row-span-1 border-r border-gray-200 p-2 text-xs text-right text-gray-500 h-16 flex items-center justify-end"> 
                <span>{slot.formatted}</span>
              </div>
              {weekDays.map(day => {
                const itemsInSlot = getItemsForTimeSlot(day, slot);
                
                return (
                  <div
                    key={day.toISOString() + slot.formatted}
                    className="border-b border-r border-gray-100 h-16 relative cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={() => handleTimeSlotClick(day, slot)}
                  >
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
                      const topPercent = (startMinute / 60) * 100;
                      const heightPercent = (durationInMinutes / 60) * 100;

                      // Only show the event if this is the starting hour
                      if (startHour !== slot.hour) {
                        return null;
                      }

                      let taskClasses = "absolute rounded p-1 text-xs overflow-hidden z-10 shadow-sm transition-colors duration-150 ease-in-out";

                      if (isCompleted) {
                        taskClasses += " bg-gray-200 text-gray-500 border border-gray-300 cursor-default";
                      } else {
                        const bgColor = isGoogleEvent ? '#7D2A4D' : (item.color || '#3b82f6');
                        const textColor = isLightColor(bgColor) ? 'text-gray-900' : 'text-white';
                        taskClasses += ` ${textColor} hover:opacity-90 ${isGoogleEvent ? 'cursor-default' : 'cursor-pointer'}`;
                        
                        // Add border for Google Calendar events for better visual distinction
                        if (isGoogleEvent) {
                          taskClasses += " border border-pink-800";
                        }
                      }

                      // Calculate width and left position based on number of events
                      // Group events by source (Google vs manual)
                      const googleEventCount = array.filter(i => 'summary' in i).length;
                      const taskEventCount = array.length - googleEventCount;
                      
                      // Adjust width and position based on event type
                      let width, left;
                      
                      if (googleEventCount > 0 && taskEventCount > 0) {
                        // If we have both types, split the cell 50/50 between Google and manual events
                        width = 48 / (isGoogleEvent ? googleEventCount : taskEventCount); // Slightly narrower for better margins
                        // Calculate position within its group
                        const groupIndex = isGoogleEvent 
                          ? array.filter(i => 'summary' in i).indexOf(item)
                          : array.filter(i => !('summary' in i)).indexOf(item);
                        left = isGoogleEvent 
                          ? 1 + (groupIndex * width) // Add 1% margin at start
                          : 51 + (groupIndex * width); // Add 1% margin between groups
                      } else {
                        // If we have only one type, use the full width with margins
                        width = (98 / array.length); // 98% total width to allow for margins
                        left = 1 + (index * width); // Add 1% margin at start
                      }

                      return (
                        <div
                          key={isGoogleEvent ? item.id : item.id.toString()}
                          className={taskClasses}
                          style={{
                            top: `${topPercent}%`,
                            height: `${Math.max(heightPercent, 5)}%`,
                            backgroundColor: isCompleted ? undefined : (isGoogleEvent ? '#7D2A4D' : item.color || '#3b82f6'),
                            width: `calc(${width}% - 2px)`, // Reduced from 4px to 2px
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

      <GoogleEventModal
        open={showEventModal}
        onClose={() => {
          setShowEventModal(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
      />
    </div>
  );
}