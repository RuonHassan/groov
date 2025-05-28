import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Task } from "@shared/schema";
import { useGoogleCalendar } from "@/contexts/GoogleCalendarContext";
import { useTaskContext } from "@/contexts/TaskContext";
import { addDays as dfnsAddDays, addMinutes, getDay, getHours, getMinutes, isBefore, isValid, parseISO, set, startOfDay, format } from "date-fns";
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
  
  // If it's Saturday, move to Monday
  if (dayOfWeek === 6) { 
    nextDay = dfnsAddDays(nextDay, 2);
  } 
  // If it's Sunday, move to Monday
  else if (dayOfWeek === 0) { 
    nextDay = dfnsAddDays(nextDay, 1);
  }
  
  return startOfDay(nextDay);
};

const isWeekend = (date: Date): boolean => {
  const day = getDay(date);
  return day === 0 || day === 6; // Sunday or Saturday
};

const moveToNextBusinessDay = (date: Date): Date => {
  let nextDay = dfnsAddDays(date, 1);
  
  // Keep moving forward until we hit a weekday
  while (isWeekend(nextDay)) {
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
  
  console.log("Finding next available slot:", {
    originalDate: date,
    duration,
    startTime,
    existingEventsCount: existingEvents.length
  });
  
  // If we're before business hours, move to start of business hours
  if (getHours(startTime) < BUSINESS_START_HOUR) {
    startTime = getStartOfBusinessHours(startTime);
    console.log("Moved to start of business hours:", startTime);
  }
  
  // If we're after business hours or on weekend, move to next business day
  if (getHours(startTime) >= BUSINESS_END_HOUR || isWeekend(startTime)) {
    const originalStartTime = startTime;
    startTime = getStartOfBusinessHours(moveToNextBusinessDay(startTime));
    console.log("Moved to next business day:", {
      from: originalStartTime,
      to: startTime,
      reason: getHours(originalStartTime) >= BUSINESS_END_HOUR ? "after business hours" : "weekend"
    });
  }

  const MAX_DAYS_TO_CHECK = 14;
  let currentDate = startOfDay(startTime);
  let businessDaysChecked = 0;

  while (businessDaysChecked < MAX_DAYS_TO_CHECK) {
    // Skip weekends
    if (isWeekend(currentDate)) {
      currentDate = moveToNextBusinessDay(currentDate);
      startTime = getStartOfBusinessHours(currentDate);
      console.log("Skipped weekend to:", currentDate);
      continue;
    }

    // If we've moved past business hours for this day, move to next business day
    if (getHours(startTime) >= BUSINESS_END_HOUR) {
      currentDate = moveToNextBusinessDay(currentDate);
      startTime = getStartOfBusinessHours(currentDate);
      businessDaysChecked++;
      console.log("Moved to next business day due to end of hours:", {
        newDate: currentDate,
        businessDaysChecked
      });
      continue;
    }

    startTime = roundToNearestInterval(startTime);
    
    // Calculate available time today, accounting for lunch break
    const maxDurationToday = getEndOfBusinessHours(currentDate).getTime() - startTime.getTime();
    const maxDurationTodayMinutes = Math.floor(maxDurationToday / (1000 * 60));
    
    let availableTimeToday = maxDurationTodayMinutes;
    const lunchStartTime = set(currentDate, { hours: LUNCH_START_HOUR, minutes: LUNCH_START_MINUTE });
    const lunchEndTime = set(currentDate, { hours: LUNCH_END_HOUR, minutes: LUNCH_END_MINUTE });
    
    // If the task would span lunch time, subtract lunch duration
    if (startTime < lunchStartTime && addMinutes(startTime, Math.min(duration, availableTimeToday)) > lunchStartTime) {
      availableTimeToday -= 60; // 1 hour lunch break
    }
    
    // Use the smaller of requested duration or available time today
    const effectiveDuration = Math.min(duration, availableTimeToday);
    const endTime = addMinutes(startTime, effectiveDuration);
    let slotOccupied = false;

    // Check if slot overlaps with lunch time
    if (isLunchTime(startTime) || (effectiveDuration > 0 && isLunchTime(addMinutes(startTime, effectiveDuration - 1)))) {
      startTime = set(currentDate, { 
        hours: LUNCH_END_HOUR, 
        minutes: LUNCH_END_MINUTE 
      });
      console.log("Skipped lunch time, moved to:", startTime);
      continue;
    }

    // Adjust end time to skip lunch if task spans across lunch
    let adjustedEndTime = endTime;
    if (startTime < lunchStartTime && endTime > lunchStartTime) {
      adjustedEndTime = addMinutes(endTime, 60); // Add lunch break duration
    }

    // Check for conflicts with existing events
    for (const event of existingEvents) {
      if (!event.start_time || !event.end_time) continue;
      try {
        const eventStart = parseISO(event.start_time);
        const eventEnd = parseISO(event.end_time);
        if (!isValid(eventStart) || !isValid(eventEnd)) continue;

        // Check for overlap using the adjusted end time
        if (isBefore(eventStart, adjustedEndTime) && isBefore(startTime, eventEnd)) {
          slotOccupied = true;
          // Move to the end of the conflicting event and round to next interval
          const nextStartTime = roundToNearestInterval(addMinutes(eventEnd, 1));
          
          console.log("Conflict found, moving past event:", {
            eventTitle: ('title' in event) ? event.title : "Untitled",
            eventStart,
            eventEnd,
            nextStartTime
          });
          
          // If moving past this event pushes us beyond business hours, we'll handle it in the next iteration
          if (getHours(nextStartTime) >= BUSINESS_END_HOUR) {
            // Set time to end of business day so next iteration will move to next day
            startTime = set(currentDate, { hours: BUSINESS_END_HOUR, minutes: 0 });
            console.log("Conflict pushed us past business hours, will move to next day");
          } else {
            startTime = nextStartTime;
          }
          break;
        }
      } catch (e) {
        console.error("Error parsing event times during slot check:", event, e);
      }
    }

    // If slot is not occupied and fits within business hours, return it
    if (!slotOccupied && isWithinBusinessHours(startTime) && isWithinBusinessHours(addMinutes(startTime, effectiveDuration - 1))) {
      console.log("Found available slot:", {
        startTime,
        endTime: addMinutes(startTime, effectiveDuration),
        effectiveDuration,
        businessDaysChecked
      });
      return roundToNearestInterval(startTime);
    }

    // Move to next 15-minute slot if no conflicts but still not valid
    if (!slotOccupied) {
      startTime = addMinutes(startTime, MINUTES_INTERVAL);
      
      // If we've moved past business hours, let the next iteration handle moving to next day
      if (getHours(startTime) >= BUSINESS_END_HOUR) {
        continue;
      }
    }
  }

  console.warn(`Could not find an available slot within ${MAX_DAYS_TO_CHECK} business days for ${duration}-minute task`);
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
  moveableConflicts: Array<{ start_time: string; end_time: string; title?: string }>;
  immoveableConflicts: Array<{ start_time: string; end_time: string; title?: string }>;
}

interface PendingSchedule {
  tasksWithDurations: TaskWithParsedInfo[];
  allEvents: Array<{ start_time: string; end_time: string; title?: string; source?: 'task' | 'calendar' }>;
  targetDate: Date;
}

interface AutoSchedulePopupProps {
  open: boolean;
  onClose: () => void;
  section: "today" | "tomorrow" | "someday" | "overdue";
  unscheduledTasks: Task[];
}

export default function AutoSchedulePopup({ open, onClose, section, unscheduledTasks }: AutoSchedulePopupProps) {
  const [isScheduling, setIsScheduling] = useState(false);
  const [conflictingTask, setConflictingTask] = useState<ConflictingTask | null>(null);
  const [pendingSchedule, setPendingSchedule] = useState<PendingSchedule | null>(null);
  
  const { isConnected, calendars, fetchEvents } = useGoogleCalendar();
  const { tasks, updateTask } = useTaskContext();

  const handleConflictResolution = async (resolution: ConflictResolution) => {
    if (!conflictingTask || !pendingSchedule) return;

    const { task, specifiedTime } = conflictingTask;
    const { tasksWithDurations, allEvents, targetDate } = pendingSchedule;

    try {
      setIsScheduling(true);

      if (resolution.action === "reschedule_new_task") {
        // Find next available slot for the new task instead of scheduling at specified time
        const taskInfo = tasksWithDurations.find(t => t.task.id === task.id);
        if (taskInfo) {
          const nextSlot = findNextAvailableSlot(specifiedTime, taskInfo.duration, allEvents);
          if (nextSlot) {
            const endTime = addMinutes(nextSlot, taskInfo.duration);
            await updateTask(task.id, {
              ...task,
              title: taskInfo.parsedInfo.cleanTitle,
              start_time: nextSlot.toISOString(),
              end_time: endTime.toISOString()
            });

            // Update allEvents and continue with remaining tasks
            const updatedEvents = [...allEvents, {
              start_time: nextSlot.toISOString(),
              end_time: endTime.toISOString(),
              title: taskInfo.parsedInfo.cleanTitle,
              source: 'task' as const
            }];

            const remainingTasks = tasksWithDurations.filter(t => t.task.id !== task.id);
            await continueScheduling(remainingTasks, updatedEvents, targetDate);
          }
        }
      } else if (resolution.action === "move_moveable_tasks" && resolution.moveableConflictsToMove) {
        // Find and move ALL moveable conflicting tasks
        console.log("Moving all conflicting tasks and scheduling anyway", {
          moveableConflicts: resolution.moveableConflictsToMove.length,
          scheduleAnywayWithImmoveable: resolution.scheduleAnywayWithImmoveable,
          tasksToMove: resolution.moveableConflictsToMove.map(c => ({ title: c.title, time: `${c.start_time} - ${c.end_time}` }))
        });
        
        let updatedEvents = [...allEvents];
        const movedTasks: Array<{ id: number; oldStart: string; oldEnd: string; newStart: string; newEnd: string }> = [];
        
        // First, remove all conflicting tasks from the events list
        for (const conflictToMove of resolution.moveableConflictsToMove) {
          updatedEvents = updatedEvents.filter(e => 
            !(e.start_time === conflictToMove.start_time && e.end_time === conflictToMove.end_time)
          );
        }
        
        console.log(`Processing ${resolution.moveableConflictsToMove.length} moveable conflicts`);
        
        // Debug: Show available tasks vs conflicts
        const availableTasks = tasks.filter(t => t.start_time && t.end_time);
        console.log("Debug - Available tasks:", availableTasks.map(t => ({
          id: t.id,
          title: t.title,
          start: t.start_time,
          end: t.end_time
        })));
        
        console.log("Debug - Conflicts to move:", resolution.moveableConflictsToMove.map(c => ({
          title: c.title,
          start: c.start_time,
          end: c.end_time
        })));
        
        // Then find new slots and move the tasks one by one
        for (const conflictToMove of resolution.moveableConflictsToMove) {
          // Find ALL tasks that match this conflict (there could be multiple with same time)
          const matchingTasks = tasks.filter(t => 
            t.start_time === conflictToMove.start_time && 
            t.end_time === conflictToMove.end_time
          );
          
          console.log(`Found ${matchingTasks.length} tasks matching conflict:`, {
            conflictTime: `${conflictToMove.start_time} - ${conflictToMove.end_time}`,
            conflictTitle: conflictToMove.title,
            matchingTaskTitles: matchingTasks.map(t => t.title)
          });
          
          if (matchingTasks.length === 0) {
            console.warn("No matching task found for conflict:", conflictToMove);
            continue;
          }
          
          // Move each matching task
          for (const taskToMove of matchingTasks) {
            // Calculate duration of the existing task
            const existingTaskDuration = (new Date(taskToMove.end_time!).getTime() - new Date(taskToMove.start_time!).getTime()) / (1000 * 60);
            
            // Find next available slot for this task - start looking after the new task's end time
            const searchStartTime = addMinutes(specifiedTime, tasksWithDurations.find(t => t.task.id === task.id)?.duration || 30);
            const nextSlot = findNextAvailableSlot(searchStartTime, existingTaskDuration, updatedEvents);
            
            if (nextSlot) {
              const endTime = addMinutes(nextSlot, existingTaskDuration);
              
              // Track the move for later batch update
              movedTasks.push({
                id: taskToMove.id,
                oldStart: taskToMove.start_time!,
                oldEnd: taskToMove.end_time!,
                newStart: nextSlot.toISOString(),
                newEnd: endTime.toISOString()
              });
              
              // Add the moved task to the updated events list immediately so subsequent tasks avoid this slot
              updatedEvents.push({
                start_time: nextSlot.toISOString(),
                end_time: endTime.toISOString(),
                title: taskToMove.title,
                source: 'task' as const
              });
              
              console.log("Moved task to new slot:", {
                taskTitle: taskToMove.title,
                taskId: taskToMove.id,
                oldTime: `${conflictToMove.start_time} - ${conflictToMove.end_time}`,
                newTime: `${nextSlot.toISOString()} - ${endTime.toISOString()}`,
                duration: existingTaskDuration
              });
            } else {
              console.warn("Could not find available slot for conflicting task:", taskToMove.title);
            }
          }
        }
        
        // Update all moved tasks in sequence to avoid race conditions
        console.log(`Updating ${movedTasks.length} moved tasks in database`);
        for (const movedTask of movedTasks) {
          const taskToMove = tasks.find(t => t.id === movedTask.id);
          if (taskToMove) {
            console.log(`Updating task ${movedTask.id}: ${movedTask.oldStart} -> ${movedTask.newStart}`);
            await updateTask(movedTask.id, {
              ...taskToMove,
              start_time: movedTask.newStart,
              end_time: movedTask.newEnd
            });
          }
        }
        
        console.log(`Successfully moved ${movedTasks.length} conflicting tasks`);
        
        // Validate we moved all expected tasks
        if (movedTasks.length !== resolution.moveableConflictsToMove.length) {
          console.warn(`Expected to move ${resolution.moveableConflictsToMove.length} tasks but only moved ${movedTasks.length}`);
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
          const finalUpdatedEvents = [...updatedEvents, {
            start_time: specifiedTime.toISOString(),
            end_time: endTime.toISOString(),
            title: taskInfo.parsedInfo.cleanTitle,
            source: 'task' as const
          }];

          const remainingTasks = tasksWithDurations.filter(t => t.task.id !== task.id);
          await continueScheduling(remainingTasks, finalUpdatedEvents, targetDate);
        }
      } else if (resolution.action === "schedule_anyway") {
        // Schedule at the specified time regardless of conflicts
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
          const updatedEvents = [...allEvents, {
            start_time: specifiedTime.toISOString(),
            end_time: endTime.toISOString(),
            title: taskInfo.parsedInfo.cleanTitle,
            source: 'task' as const
          }];

          const remainingTasks = tasksWithDurations.filter(t => t.task.id !== task.id);
          await continueScheduling(remainingTasks, updatedEvents, targetDate);
        }
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
    allEvents: Array<{ start_time: string; end_time: string; title?: string; source?: 'task' | 'calendar' }>, 
    targetDate: Date
  ) => {
    let startTime: Date;
    if (section === "tomorrow") {
      // For tomorrow, always start at beginning of business hours
      startTime = getStartOfBusinessHours(targetDate);
    } else {
      // For today, start from current time but ensure it's within business hours
      const currentTime = roundToNearestInterval(new Date());
      if (isWeekend(currentTime)) {
        // If it's weekend, move to next Monday
        startTime = getStartOfBusinessHours(moveToNextBusinessDay(currentTime));
      } else if (getHours(currentTime) >= BUSINESS_END_HOUR) {
        // If it's after business hours, move to next business day
        startTime = getStartOfBusinessHours(moveToNextBusinessDay(currentTime));
      } else if (getHours(currentTime) < BUSINESS_START_HOUR) {
        // If it's before business hours, move to start of business hours today
        startTime = getStartOfBusinessHours(currentTime);
      } else {
        // During business hours - start from current time
        startTime = currentTime;
      }
    }

    console.log("Calculated start time:", {
      section,
      startTime,
      targetDate,
      currentTime: new Date()
    });

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
          title: taskInfo.parsedInfo.cleanTitle,
          source: 'task' as const
        });
        startTime = endTime;
      }
    }
  };

  const handleAutoSchedule = async () => {
    setIsScheduling(true);
    const now = new Date();
    const today = roundToNearestInterval(now);
    const targetDate = section === "today" ? today : section === "tomorrow" ? dfnsAddDays(today, 1) : section === "overdue" ? today : today;
    
    console.log("Auto-schedule starting:", {
      section,
      now,
      today,
      targetDate,
      isWeekend: isWeekend(targetDate)
    });
    
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
      const convertedGoogleEvents: Array<{ start_time: string; end_time: string; title?: string; source: 'calendar' }> = googleEvents.map(event => ({
        start_time: event.start.dateTime,
        end_time: event.end.dateTime,
        title: event.summary,
        source: 'calendar'
      }));

      // Get scheduled tasks (exclude overdue tasks from conflicts if we're rescheduling overdue)
      const scheduledTasks = tasks.filter(task => 
        task.start_time && 
        task.end_time &&
        // If we're handling overdue tasks, exclude them from the conflict list since we're moving them
        !(section === "overdue" && unscheduledTasks.some(overdueTask => overdueTask.id === task.id))
      ).map(task => ({
        start_time: task.start_time!,
        end_time: task.end_time!,
        title: task.title,
        source: 'task' as const
      }));

      // Combine all events
      const allEvents = [...convertedGoogleEvents, ...scheduledTasks];

      console.log("Events loaded:", {
        googleEvents: convertedGoogleEvents.length,
        scheduledTasks: scheduledTasks.length,
        totalEvents: allEvents.length
      });

      // Handle overdue tasks differently - they need to be moved from past to future
      if (section === "overdue") {
        // For overdue tasks, we first clear their current schedule and then reschedule them
        const tasksWithDurations: TaskWithParsedInfo[] = [];
        for (const task of unscheduledTasks) {
          let duration = 30; // default fallback
          
          // If task has both start and end time, preserve the original duration
          if (task.start_time && task.end_time) {
            try {
              const originalStart = parseISO(task.start_time);
              const originalEnd = parseISO(task.end_time);
              if (isValid(originalStart) && isValid(originalEnd)) {
                // Calculate original duration in minutes
                duration = Math.round((originalEnd.getTime() - originalStart.getTime()) / (1000 * 60));
              }
            } catch (e) {
              console.error("Error calculating original duration for overdue task:", task, e);
              // Fall back to estimation if we can't parse the original times
              duration = await estimateDuration(task.title, task.notes);
            }
          } else {
            // Only estimate duration for tasks without end times
            const parsedInfo = parseTaskTitle(task.title, targetDate);
            const title = parsedInfo.cleanTitle.toLowerCase();
            const isEmail = /email|e-mail|send/.test(title);
            const isSlides = /slide|slides|prep|preparing|presentation/.test(title);

            if (isEmail) {
              duration = 15;
            } else if (isSlides) {
              duration = 30;
            } else if (parsedInfo.hasDurationSpecification && parsedInfo.specifiedDuration) {
              duration = parsedInfo.specifiedDuration;
            } else {
              duration = await estimateDuration(parsedInfo.cleanTitle, task.notes);
            }
          }

          // Clear the existing schedule for overdue tasks
          if (task.start_time && task.end_time) {
            await updateTask(task.id, {
              ...task,
              start_time: null,
              end_time: null
            });
          }

          const parsedInfo = parseTaskTitle(task.title, targetDate);
          tasksWithDurations.push({ 
            task, 
            duration, 
            isEmail: /email|e-mail|send/.test(parsedInfo.cleanTitle.toLowerCase()),
            parsedInfo,
            hasSpecificTime: false, // Don't honor past time specifications for overdue tasks
            specifiedTime: undefined
          });
        }

        // Schedule all overdue tasks starting from now
        let startTime = roundToNearestInterval(today);
        for (const taskInfo of tasksWithDurations) {
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
              title: taskInfo.parsedInfo.cleanTitle,
              source: 'task' as const
            });
            startTime = endTime;
          }
        }

        onClose();
        return;
      }

      // Regular handling for non-overdue tasks (existing logic)
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
        } else if (parsedInfo.hasDurationSpecification && parsedInfo.specifiedDuration) {
          duration = parsedInfo.specifiedDuration;
        } else {
          duration = await estimateDuration(parsedInfo.cleanTitle, task.notes);
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
          const { moveableConflicts, immoveableConflicts } = checkTimeConflict(taskInfo.specifiedTime, taskInfo.duration, allEvents);
          
          console.log("Checking conflicts for task:", {
            task: taskInfo.task.title,
            specifiedTime: taskInfo.specifiedTime,
            duration: taskInfo.duration,
            moveableConflicts: moveableConflicts.length,
            immoveableConflicts: immoveableConflicts.length,
            allEventsCount: allEvents.length,
            moveableConflictsDetails: moveableConflicts.map(c => ({ title: c.title, time: `${c.start_time} - ${c.end_time}` })),
            immoveableConflictsDetails: immoveableConflicts.map(c => ({ title: c.title, time: `${c.start_time} - ${c.end_time}` }))
          });
          
          if (moveableConflicts.length > 0 || immoveableConflicts.length > 0) {
            console.log("Conflicts found, showing resolution dialog", {
              moveableConflicts,
              immoveableConflicts
            });
            
            // Show conflict resolution dialog
            setConflictingTask({
              task: taskInfo.task,
              specifiedTime: taskInfo.specifiedTime,
              moveableConflicts,
              immoveableConflicts
            });
            setPendingSchedule({ tasksWithDurations, allEvents, targetDate });
            setIsScheduling(false);
            return;
          }
        }
      }

      // If no conflicts, proceed with normal scheduling
      let startTime: Date;
      if (section === "tomorrow") {
        // For tomorrow, always start at beginning of business hours
        startTime = getStartOfBusinessHours(targetDate);
      } else {
        // For today, start from current time but ensure it's within business hours
        const currentTime = roundToNearestInterval(new Date());
        if (isWeekend(currentTime)) {
          // If it's weekend, move to next Monday
          startTime = getStartOfBusinessHours(moveToNextBusinessDay(currentTime));
        } else if (getHours(currentTime) >= BUSINESS_END_HOUR) {
          // If it's after business hours, move to next business day
          startTime = getStartOfBusinessHours(moveToNextBusinessDay(currentTime));
        } else if (getHours(currentTime) < BUSINESS_START_HOUR) {
          // If it's before business hours, move to start of business hours today
          startTime = getStartOfBusinessHours(currentTime);
        } else {
          // During business hours - start from current time
          startTime = currentTime;
        }
      }

      console.log("Calculated start time:", {
        section,
        startTime,
        targetDate,
        currentTime: new Date()
      });

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
            title: taskInfo.parsedInfo.cleanTitle,
            source: 'task' as const
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
    return parsed.hasTimeSpecification || parsed.hasDaySpecification || parsed.hasDurationSpecification;
  }).length;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="!max-w-[380px] w-[calc(100%-1rem)] !sm:max-w-[380px] rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">Let us put these in your calendar for you?</DialogTitle>
            <DialogDescription className="text-sm">
              {section === "overdue" 
                ? "We'll move these overdue tasks from their past schedule to the next available slots, keeping your lunch free!"
                : "We'll schedule them for the next available slots, keeping your lunch free! Tasks longer than a business day will be intelligently split across multiple days."
              }
              {tasksWithSpecificTimes > 0 && section !== "overdue" && (
                <span className="block mt-1 text-blue-600 font-medium">
                  {tasksWithSpecificTimes} task{tasksWithSpecificTimes > 1 ? 's have' : ' has'} specific time requirements.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <h4 className="mb-1.5 font-medium text-sm">
              {section === "overdue" ? "Overdue tasks to be moved:" : "Tasks to be scheduled:"}
            </h4>
            <ul className="space-y-1">
              {unscheduledTasks.map(task => {
                const parsed = parseTaskTitle(task.title);
                const hasSpecificRequirements = parsed.hasTimeSpecification || parsed.hasDaySpecification || parsed.hasDurationSpecification;
                const isOverdueWithSchedule = section === "overdue" && task.start_time;
                return (
                  <li key={task.id} className="text-sm text-gray-600 flex">
                    <span className="mr-2 flex-shrink-0">•</span>
                    <div className="flex flex-col">
                      <span className={hasSpecificRequirements && section !== "overdue" ? "font-medium text-blue-600" : ""}>
                        {task.title}
                      </span>
                      {isOverdueWithSchedule && (
                        <span className="text-xs text-red-500 mt-0.5">
                          Currently: {format(parseISO(task.start_time!), "MMM d, h:mm a")}
                          {task.end_time && (
                            <span className="ml-2 text-gray-500">
                              ({Math.round((parseISO(task.end_time).getTime() - parseISO(task.start_time!).getTime()) / (1000 * 60))} min)
                            </span>
                          )}
                        </span>
                      )}
                    </div>
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
          moveableConflicts={conflictingTask.moveableConflicts}
          immoveableConflicts={conflictingTask.immoveableConflicts}
        />
      )}
    </>
  );
} 