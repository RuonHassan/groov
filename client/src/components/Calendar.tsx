import React, { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO, isWithinInterval, isValid, getHours, getMinutes, getDay } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Task } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useWeek } from "@/contexts/WeekContext";
import { supabase } from "@/lib/supabaseClient";
import AddTaskModal from './AddTaskModal';
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

// Generate time slots from 8 AM to 8 PM
function generateTimeSlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let hour = 8; hour <= 20; hour++) {
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
}

export default function Calendar({ tasks }: CalendarProps) {
  const { currentDate } = useWeek();
  const { toast } = useToast();
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultTaskTimes, setDefaultTaskTimes] = useState<{ start_time: string | null; end_time: string | null }>({ start_time: null, end_time: null });
  const { isConnected, calendars, fetchEvents } = useGoogleCalendar();
  const [googleEvents, setGoogleEvents] = useState<GoogleEvent[]>([]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); 
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  // Fetch Google Calendar events when the week changes
  useEffect(() => {
    const fetchGoogleEvents = async () => {
      if (!isConnected || calendars.length === 0) return;

      try {
        const allEvents = await Promise.all(
          calendars.map(calendar => 
            fetchEvents(calendar.id, weekStart, weekEnd)
          )
        );

        // Flatten and deduplicate events
        const events = Array.from(new Set(allEvents.flat()));
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
  }, [isConnected, calendars, weekStart, weekEnd, fetchEvents]);

  const allWeekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  const weekDays = allWeekDays.filter(day => {
      const dayOfWeek = getDay(day);
      return dayOfWeek !== 0 && dayOfWeek !== 6; // Exclude Sunday (0) and Saturday (6)
  });
  const desktopWeekDays = allWeekDays;

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

  // Get color based on task status (similar logic as before)
  const getTaskColor = (task: Task): string => {
    // Use task status to determine color
    switch(task.status) {
      case 'next': return '#3b82f6'; // blue
      case 'waiting': return '#f59e0b'; // amber
      case 'project': return '#8b5cf6'; // purple
      case 'someday': return '#6b7280'; // gray
      case 'completed': return '#10b981'; // green (for completed tasks if shown)
      default: return '#3b82f6'; // Default blue for inbox etc.
    }
  };

  // Helper function to check if a color is light
  const isLightColor = (color: string): boolean => {
    const c = color.substring(1);
    const rgb = parseInt(c, 16);
    const luma = (rgb >> 16) * 0.299 + (rgb >> 8 & 255) * 0.587 + (rgb & 255) * 0.114;
    return luma > 128;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b-2 border-b-gray-800">
        <span className="font-semibold text-xl">
          {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
        </span>
      </div>
      
      <div className="flex-1 overflow-auto border-t border-gray-200">
        <div className="grid grid-cols-[auto_repeat(5,minmax(0,1fr))] md:grid-cols-[auto_repeat(7,minmax(100px,1fr))] md:min-w-[800px]">
          <div className="sticky top-0 z-20 bg-white border-r border-b border-gray-200 p-2 text-xs font-medium text-gray-500 text-center">Time</div>
          {desktopWeekDays.map(day => {
            const dayOfWeek = getDay(day);
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            return (
                <div 
                    key={day.toISOString()} 
                    className={`sticky top-0 z-20 bg-white border-b border-gray-200 p-2 text-center ${isWeekend ? 'hidden md:block' : ''}`}>
                  <div className="text-xs font-medium text-gray-500">{formatWeekdayHeader(day)}</div>
                  <div className={`text-lg font-semibold ${isSameDay(day, new Date()) ? 'text-blue-600' : 'text-gray-900'}`}>
                    {formatDateHeader(day)}
                  </div>
                </div>
            );
          })}

          {timeSlots.map(slot => (
            <React.Fragment key={slot.formatted}>
              <div className="row-span-1 border-r border-gray-200 p-2 text-xs text-right text-gray-500 h-16 flex items-center justify-end"> 
                <span>{slot.formatted}</span>
              </div>
              {desktopWeekDays.map(day => {
                const dayOfWeek = getDay(day);
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const itemsInSlot = getItemsForTimeSlot(day, slot);
                
                return (
                  <div
                    key={day.toISOString() + slot.formatted}
                    className={`border-b border-r border-gray-100 h-16 relative cursor-pointer hover:bg-blue-50 transition-colors ${isWeekend ? 'hidden md:block' : ''}`}
                    onClick={() => handleTimeSlotClick(day, slot)}
                  >
                    {itemsInSlot.map(item => {
                      const isGoogleEvent = 'summary' in item;
                      const title = isGoogleEvent ? item.summary : item.title;
                      const start = isGoogleEvent ? item.start.dateTime : item.start_time!;
                      const end = isGoogleEvent ? item.end.dateTime : item.end_time!;
                      const startDate = parseISO(start);
                      const endDate = parseISO(end);
                      const isCompleted = !isGoogleEvent && !!item.completed_at;

                      const startMinute = getMinutes(startDate);
                      const durationInMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
                      const topPercent = (startMinute / 60) * 100;
                      const heightPercent = (durationInMinutes / 60) * 100;

                      let taskClasses = "absolute left-1 right-1 rounded p-1 text-xs overflow-hidden z-10 shadow-sm transition-colors duration-150 ease-in-out";

                      if (isCompleted) {
                        taskClasses += " bg-gray-200 text-gray-500 border border-gray-300 cursor-default";
                      } else {
                        const bgColor = isGoogleEvent ? '#7D2A4D' : (item.color || '#3b82f6');
                        const textColor = isLightColor(bgColor) ? 'text-gray-900' : 'text-white';
                        taskClasses += ` ${textColor} hover:opacity-90 ${isGoogleEvent ? 'cursor-default' : 'cursor-pointer'}`;
                      }

                      return (
                        <div
                          key={isGoogleEvent ? item.id : item.id.toString()}
                          className={taskClasses}
                          style={{
                            top: `${topPercent}%`,
                            height: `${Math.max(heightPercent, 5)}%`,
                            backgroundColor: isCompleted ? undefined : (isGoogleEvent ? '#7D2A4D' : item.color || '#3b82f6'),
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isGoogleEvent && !isCompleted) {
                              handleTaskClick(item as Task);
                            }
                          }}
                        >
                          <p className="font-medium truncate">
                            {isGoogleEvent && '🗓️ '}{title}
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
    </div>
  );
}