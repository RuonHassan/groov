import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Task } from "@shared/schema";
import { useGoogleCalendar } from "@/contexts/GoogleCalendarContext";
import { useTaskContext } from "@/contexts/TaskContext";
import { addDays as dfnsAddDays, addMinutes, getDay, getHours, getMinutes, isBefore, isValid, parseISO, set, startOfDay } from "date-fns";
import { estimateDuration } from "@/lib/gemini";
import { parseTaskTitle, checkTimeConflict } from "@/lib/taskParsing";
import { Loader2 } from "lucide-react";
import ConflictResolutionPopup, { ConflictResolution } from "./ConflictResolutionPopup";

// Constants for business hours
const BUSINESS_START_HOUR = 9; // 9 AM
const BUSINESS_END_HOUR = 17;  // 5 PM
const MINUTES_INTERVAL = 15;   // 15-minute intervals
const LUNCH_START_HOUR = 12;   // 12:30 PM
const LUNCH_START_MINUTE = 30;
const LUNCH_END_HOUR = 13;     // 1:30 PM
const LUNCH_END_MINUTE = 30;

// Types
type CalendarTimeSlot = {
  start_time: string;
  end_time: string;
};

// Helper Functions
const roundToNearestInterval = (date: Date): Date => {
  const minutes = getMinutes(date);
  const roundedMinutes = Math.ceil(minutes / MINUTES_INTERVAL) * MINUTES_INTERVAL;
  return set(date, { 
    minutes: roundedMinutes >= 60 ? 0 : roundedMinutes,
    seconds: 0, 
    milliseconds: 0,
    hours: roundedMinutes >= 60 ? getHours(date) + 1 : getHours(date)
  });
};

const getNextBusinessDay = (date: Date): Date => {
  let nextDay = dfnsAddDays(date, 1);
  const dayOfWeek = getDay(nextDay);
  
  if (dayOfWeek === 6) { // Saturday
    nextDay = dfnsAddDays(nextDay, 2);
  } else if (dayOfWeek === 0) { // Sunday
    nextDay = dfnsAddDays(nextDay, 1);
  }
  
  return startOfDay(nextDay);
};

const isWithinBusinessHours = (date: Date): boolean => {
  const hour = getHours(date);
  return hour >= BUSINESS_START_HOUR && hour < BUSINESS_END_HOUR;
};

const getStartOfBusinessHours = (date: Date): Date => {
  return set(date, { hours: BUSINESS_START_HOUR, minutes: 0, seconds: 0, milliseconds: 0 });
};

const getEndOfBusinessHours = (date: Date): Date => {
  return set(date, { hours: BUSINESS_END_HOUR, minutes: 0, seconds: 0, milliseconds: 0 });
};

const isLunchTime = (date: Date): boolean => {
  const hour = getHours(date);
  const minutes = getMinutes(date);
  const totalMinutes = hour * 60 + minutes;
  const lunchStartMinutes = LUNCH_START_HOUR * 60 + LUNCH_START_MINUTE;
  const lunchEndMinutes = LUNCH_END_HOUR * 60 + LUNCH_END_MINUTE;
  return totalMinutes >= lunchStartMinutes && totalMinutes < lunchEndMinutes;
};

const findNextAvailableSlot = (date: Date, duration: number, existingEvents: (CalendarTimeSlot | Task)[]): Date | null => {
  let startTime = roundToNearestInterval(date);
  
  if (getHours(startTime) < BUSINESS_START_HOUR) {
    startTime = getStartOfBusinessHours(startTime);
  }
  
  if (getHours(startTime) >= BUSINESS_END_HOUR || [0, 6].includes(getDay(startTime))) {
    startTime = getStartOfBusinessHours(getNextBusinessDay(startTime));
  }

  const MAX_DAYS_TO_CHECK = 14;
  let daysChecked = 0;

  while (daysChecked < MAX_DAYS_TO_CHECK) {
    if (getHours(startTime) >= BUSINESS_END_HOUR) {
      startTime = getStartOfBusinessHours(getNextBusinessDay(startTime));
      daysChecked++;
      continue;
    }

    startTime = roundToNearestInterval(startTime);
    const endTime = addMinutes(startTime, duration);
    let slotOccupied = false;

    // Check if slot overlaps with lunch time
    if (isLunchTime(startTime) || isLunchTime(addMinutes(startTime, duration - 1))) {
      startTime = set(startTime, { 
        hours: LUNCH_END_HOUR, 
        minutes: LUNCH_END_MINUTE 
      });
      continue;
    }

    for (const event of existingEvents) {
      if (!event.start_time || !event.end_time) continue;
      try {
        const eventStart = parseISO(event.start_time);
        const eventEnd = parseISO(event.end_time);
        if (!isValid(eventStart) || !isValid(eventEnd)) continue;

        if (isBefore(eventStart, endTime) && isBefore(startTime, eventEnd)) {
          slotOccupied = true;
          startTime = roundToNearestInterval(addMinutes(eventEnd, 1));
          
          if (getHours(startTime) >= BUSINESS_END_HOUR) {
            startTime = getStartOfBusinessHours(getNextBusinessDay(startTime));
            daysChecked++;
          }
          break;
        }
      } catch (e) {
        console.error("Error parsing event times during slot check:", event, e);
      }
    }

    if (!slotOccupied && isWithinBusinessHours(startTime)) {
      return roundToNearestInterval(startTime);
    }

    startTime = addMinutes(startTime, MINUTES_INTERVAL);
  }

  return null;
};

interface TaskWithParsedInfo {
  task: Task;
  duration: number;
  isEmail: boolean;
  parsedInfo: ReturnType<typeof parseTaskTitle>;
  hasSpecificTime: boolean;
  specifiedTime?: Date;
}

interface ConflictingTask {
  task: Task;
  specifiedTime: Date;
  conflicts: Array<{ start_time: string; end_time: string; title?: string }>;
}

interface AutoSchedulePopupProps {
  open: boolean;
  onClose: () => void;
  section: "today" | "tomorrow" | "someday";
  unscheduledTasks: Task[];
}

export default function AutoSchedulePopup({ open, onClose, section, unscheduledTasks }: AutoSchedulePopupProps) {
  const [isScheduling, setIsScheduling] = useState(false);
  const [conflictingTask, setConflictingTask] = useState<ConflictingTask | null>(null);
  const [pendingSchedule, setPendingSchedule] = useState<{
    tasksWithDurations: TaskWithParsedInfo[];
    allEvents: Array<{ start_time: string; end_time: string; title?: string }>;
    targetDate: Date;
  } | null>(null);
  
  const { isConnected, calendars, fetchEvents } = useGoogleCalendar();
  const { tasks, updateTask } = useTaskContext();

  const handleConflictResolution = async (resolution: ConflictResolution) => {
    if (!conflictingTask || !pendingSchedule) return;

    const { task, specifiedTime } = conflictingTask;
    const { tasksWithDurations, allEvents, targetDate } = pendingSchedule;
    
    if (resolution.action === "cancel") {
      setConflictingTask(null);
      setPendingSchedule(null);
      return;
    }

    try {
      setIsScheduling(true);

      if (resolution.action === "move_all_existing" && resolution.conflictsToMove) {
        // Find and move ALL conflicting tasks
        let updatedEvents = [...allEvents];
        
        for (const conflictToMove of resolution.conflictsToMove) {
          const taskToMove = tasks.find(t => 
            t.start_time === conflictToMove.start_time && 
            t.end_time === conflictToMove.end_time
          );
          
          if (taskToMove) {
            // Calculate duration of the existing task
            const existingTaskDuration = (new Date(taskToMove.end_time!).getTime() - new Date(taskToMove.start_time!).getTime()) / (1000 * 60);
            
            // Remove this task from the events list for finding next slot
            updatedEvents = updatedEvents.filter(e => 
              !(e.start_time === taskToMove.start_time && e.end_time === taskToMove.end_time)
            );
            
            // Find next available slot for this task
            const nextSlot = findNextAvailableSlot(specifiedTime, existingTaskDuration, updatedEvents);
            
            if (nextSlot) {
              const endTime = addMinutes(nextSlot, existingTaskDuration);
              await updateTask(taskToMove.id, {
                ...taskToMove,
                start_time: nextSlot.toISOString(),
                end_time: endTime.toISOString()
              });
              
              // Add the moved task to the updated events list
              updatedEvents.push({
                start_time: nextSlot.toISOString(),
                end_time: endTime.toISOString(),
                title: taskToMove.title
              });
            }
          }
        }
        
        // Update the pending schedule with the new events list
        setPendingSchedule(prev => prev ? { ...prev, allEvents: updatedEvents } : null);
      }

      // Now schedule the conflicting task at its specified time
      const taskInfo = tasksWithDurations.find(t => t.task.id === task.id);
      if (taskInfo) {
        const endTime = addMinutes(specifiedTime, taskInfo.duration);
        await updateTask(task.id, {
          ...task,
          title: taskInfo.parsedInfo.cleanTitle,
          start_time: specifiedTime.toISOString(),
          end_time: endTime.toISOString()
        });

        // Update allEvents and continue with remaining tasks
        const updatedEvents = [...(pendingSchedule?.allEvents || []), {
          start_time: specifiedTime.toISOString(),
          end_time: endTime.toISOString(),
          title: taskInfo.parsedInfo.cleanTitle
        }];

        const remainingTasks = tasksWithDurations.filter(t => t.task.id !== task.id);
        await continueScheduling(remainingTasks, updatedEvents, targetDate);
      }

      setConflictingTask(null);
      setPendingSchedule(null);
      onClose();
    } catch (error) {
      console.error("Error resolving conflict:", error);
    } finally {
      setIsScheduling(false);
    }
  };

  const continueScheduling = async (
    remainingTasks: TaskWithParsedInfo[], 
    allEvents: Array<{ start_time: string; end_time: string; title?: string }>, 
    targetDate: Date
  ) => {
    let startTime = section === "tomorrow"
      ? getStartOfBusinessHours(targetDate)
      : roundToNearestInterval(new Date());

    // Schedule remaining tasks that don't have specific times
    for (const taskInfo of remainingTasks.filter(t => !t.hasSpecificTime)) {
      const nextSlot = findNextAvailableSlot(startTime, taskInfo.duration, allEvents);
      if (nextSlot) {
        const endTime = addMinutes(nextSlot, taskInfo.duration);
        await updateTask(taskInfo.task.id, {
          ...taskInfo.task,
          title: taskInfo.parsedInfo.cleanTitle,
          start_time: nextSlot.toISOString(),
          end_time: endTime.toISOString()
        });
        allEvents.push({
          start_time: nextSlot.toISOString(),
          end_time: endTime.toISOString(),
          title: taskInfo.parsedInfo.cleanTitle
        });
        startTime = endTime;
      }
    }
  };

  const handleAutoSchedule = async () => {
    setIsScheduling(true);
    const today = roundToNearestInterval(new Date());
    const targetDate = section === "today" ? today : section === "tomorrow" ? dfnsAddDays(today, 1) : today;
    
    try {
      // Get Google Calendar events
      let googleEvents: any[] = [];
      if (isConnected && calendars.length > 0) {
        const startOfTargetDate = startOfDay(targetDate);
        const endDate = dfnsAddDays(startOfTargetDate, 14);
        const eventsPromises = calendars.map(calendar => 
          fetchEvents(calendar.calendar_id, startOfTargetDate, endDate)
        );
        googleEvents = (await Promise.all(eventsPromises)).flat();
      }

      // Convert Google events
      const convertedGoogleEvents: Array<{ start_time: string; end_time: string; title?: string }> = googleEvents.map(event => ({
        start_time: event.start.dateTime,
        end_time: event.end.dateTime,
        title: event.summary
      }));

      // Get scheduled tasks
      const scheduledTasks = tasks.filter(task => 
        task.start_time && 
        task.end_time
      ).map(task => ({
        start_time: task.start_time!,
        end_time: task.end_time!,
        title: task.title
      }));

      // Combine all events
      const allEvents = [...convertedGoogleEvents, ...scheduledTasks];

      // Parse and prepare tasks with durations and time specifications
      const tasksWithDurations: TaskWithParsedInfo[] = [];
      for (const task of unscheduledTasks) {
        const parsedInfo = parseTaskTitle(task.title, targetDate);
        const title = parsedInfo.cleanTitle.toLowerCase();
        const isEmail = /email|e-mail|send/.test(title);
        const isSlides = /slide|slides|prep|preparing|presentation/.test(title);
        let duration = 30;

        if (isEmail) {
          duration = 15;
        } else if (isSlides) {
          duration = 30;
        } else {
          duration = await estimateDuration(parsedInfo.cleanTitle);
        }

        tasksWithDurations.push({ 
          task, 
          duration, 
          isEmail, 
          parsedInfo,
          hasSpecificTime: parsedInfo.hasTimeSpecification,
          specifiedTime: parsedInfo.specifiedTime
        });
      }

      // Sort tasks: specific times first, then emails
      tasksWithDurations.sort((a, b) => {
        if (a.hasSpecificTime && !b.hasSpecificTime) return -1;
        if (!a.hasSpecificTime && b.hasSpecificTime) return 1;
        if (!a.hasSpecificTime && !b.hasSpecificTime) {
          return Number(b.isEmail) - Number(a.isEmail);
        }
        return 0;
      });

      // Check for conflicts with tasks that have specific times
      for (const taskInfo of tasksWithDurations.filter(t => t.hasSpecificTime)) {
        if (taskInfo.specifiedTime) {
          const conflicts = checkTimeConflict(taskInfo.specifiedTime, taskInfo.duration, allEvents);
          if (conflicts.length > 0) {
            // Show conflict resolution dialog
            setConflictingTask({
              task: taskInfo.task,
              specifiedTime: taskInfo.specifiedTime,
              conflicts
            });
            setPendingSchedule({ tasksWithDurations, allEvents, targetDate });
            setIsScheduling(false);
            return;
          }
        }
      }

      // If no conflicts, proceed with normal scheduling
      let startTime = section === "tomorrow"
        ? getStartOfBusinessHours(targetDate)
        : roundToNearestInterval(today);

      // Schedule tasks with specific times first
      for (const taskInfo of tasksWithDurations.filter(t => t.hasSpecificTime)) {
        if (taskInfo.specifiedTime) {
          const endTime = addMinutes(taskInfo.specifiedTime, taskInfo.duration);
          await updateTask(taskInfo.task.id, {
            ...taskInfo.task,
            title: taskInfo.parsedInfo.cleanTitle,
            start_time: taskInfo.specifiedTime.toISOString(),
            end_time: endTime.toISOString()
          });
          allEvents.push({
            start_time: taskInfo.specifiedTime.toISOString(),
            end_time: endTime.toISOString(),
            title: taskInfo.parsedInfo.cleanTitle
          });
        }
      }

      // Schedule remaining tasks
      await continueScheduling(tasksWithDurations.filter(t => !t.hasSpecificTime), allEvents, targetDate);

      onClose();
    } catch (error) {
      console.error("Error auto-scheduling tasks:", error);
    } finally {
      setIsScheduling(false);
    }
  };

  // Count tasks with specific time requirements
  const tasksWithSpecificTimes = unscheduledTasks.filter(task => {
    const parsed = parseTaskTitle(task.title);
    return parsed.hasTimeSpecification || parsed.hasDaySpecification;
  }).length;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="!max-w-[380px] w-[calc(100%-1rem)] !sm:max-w-[380px] rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">Let us put these in your calendar for you?</DialogTitle>
            <DialogDescription className="text-sm">
              We'll schedule them for the next available slots, keeping your lunch free!
              {tasksWithSpecificTimes > 0 && (
                <span className="block mt-1 text-blue-600 font-medium">
                  {tasksWithSpecificTimes} task{tasksWithSpecificTimes > 1 ? 's have' : ' has'} specific time requirements.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <h4 className="mb-1.5 font-medium text-sm">Tasks to be scheduled:</h4>
            <ul className="space-y-1">
              {unscheduledTasks.map(task => {
                const parsed = parseTaskTitle(task.title);
                const hasSpecificRequirements = parsed.hasTimeSpecification || parsed.hasDaySpecification;
                return (
                  <li key={task.id} className="text-sm text-gray-600 flex">
                    <span className="mr-2 flex-shrink-0">•</span>
                    <span className={hasSpecificRequirements ? "font-medium text-blue-600" : ""}>
                      {task.title}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <DialogFooter className="flex justify-center">
            <Button onClick={handleAutoSchedule} disabled={isScheduling} size="sm" className="w-full">
              {isScheduling && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {isScheduling ? "Scheduling..." : "Schedule Tasks"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {conflictingTask && (
        <ConflictResolutionPopup
          open={!!conflictingTask}
          onClose={() => {
            setConflictingTask(null);
            setPendingSchedule(null);
            setIsScheduling(false);
          }}
          onResolve={handleConflictResolution}
          task={conflictingTask.task}
          specifiedTime={conflictingTask.specifiedTime}
          conflicts={conflictingTask.conflicts}
        />
      )}
    </>
  );
} 