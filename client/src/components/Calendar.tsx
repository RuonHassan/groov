import React, { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO, isWithinInterval, isValid } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Task } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useWeek } from "@/contexts/WeekContext";
import { supabase } from "@/lib/supabaseClient";
import AddTaskModal from './AddTaskModal';

// Time slot definition
interface TimeSlot {
  hour: number;
  minute: number;
  formatted: string;
}

// Generate time slots (e.g., 8am to 10pm, hourly)
const generateTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  for (let hour = 8; hour < 22; hour++) {
    const isPM = hour >= 12;
    const displayHour = hour % 12 || 12;
    const formattedTime = `${displayHour}:00 ${isPM ? 'PM' : 'AM'}`;
    slots.push({ hour, minute: 0, formatted: formattedTime });
  }
  return slots;
};

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

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); 
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const formatWeekdayHeader = (date: Date) => format(date, 'EEE');
  const formatDateHeader = (date: Date) => format(date, 'd');

  // Check if a TASK overlaps with a specific time slot
  const isTaskInTimeSlot = (task: Task, date: Date, timeSlot: TimeSlot): boolean => {
    // Task must have start and end times to be placed precisely
    if (!task.start_time || !task.end_time) return false; 
    
    try {
      const taskStart = parseISO(task.start_time); 
      const taskEnd = parseISO(task.end_time);
      if (!isValid(taskStart) || !isValid(taskEnd)) return false; // Skip if dates are invalid

      // Calculate the start and end of the time slot (e.g., 30 or 60 mins)
      // Assuming hourly slots for now based on generateTimeSlots
      const slotStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), timeSlot.hour, timeSlot.minute);
      const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000); // Add 60 minutes for hourly slot

      // Check for overlap: task starts before slot ends AND task ends after slot starts
      return taskStart < slotEnd && taskEnd > slotStart;
    } catch (e) {
      console.error("Error parsing task dates:", task, e);
      return false; 
    }
  };

  // Get TASKS for a specific day and time slot
  const getTasksForTimeSlot = (date: Date, timeSlot: TimeSlot): Task[] => {
    return tasks.filter(task => {
      // Task must have a start_time to be considered for a specific slot
      if (!task.start_time) return false;
      
      try {
        const taskStart = parseISO(task.start_time);
        if (!isValid(taskStart)) return false;
        // Check if task starts on the current day AND overlaps with the time slot
        return isSameDay(taskStart, date) && isTaskInTimeSlot(task, date, timeSlot); 
      } catch (e) {
        console.error("Error parsing task start date:", task, e);
        return false;
      }
    });
  };

  // Handle click on a time slot to CREATE a new task
  const handleTimeSlotClick = (date: Date, slot: TimeSlot) => {
    const startTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), slot.hour, slot.minute);
    // Default to 1 hour duration
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); 

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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b">
          <span className="font-semibold">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </span>
      </div>
      
      <div className="flex-1 overflow-auto border-t border-gray-200">
        <div className="grid grid-cols-[auto_repeat(7,minmax(100px,1fr))] min-w-[800px]">
          <div className="sticky top-0 z-10 bg-white border-r border-b border-gray-200 p-2 text-xs font-medium text-gray-500 text-center">Time</div>
          {weekDays.map(day => (
            <div key={day.toISOString()} className="sticky top-0 z-10 bg-white border-b border-gray-200 p-2 text-center">
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
                const tasksInSlot = getTasksForTimeSlot(day, slot); 
                
                return (
                  <div
                    key={day.toISOString() + slot.formatted}
                    className="border-b border-r border-gray-100 p-1 h-16 relative cursor-pointer hover:bg-blue-50 transition-colors" 
                    onClick={() => handleTimeSlotClick(day, slot)}
                  >
                    {tasksInSlot.map(task => {
                      return (
                        <div
                          key={task.id}
                          className="m-0.5 p-1 rounded text-xs leading-tight shadow overflow-hidden cursor-pointer hover:opacity-80"
                          style={{ backgroundColor: task.color || '#3b82f6', color: 'white' }} 
                          onClick={(e) => { e.stopPropagation(); handleTaskClick(task); }}
                        >
                          <p className="font-semibold truncate">{task.title}</p>
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