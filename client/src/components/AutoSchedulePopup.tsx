import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Task } from "@shared/schema";
import { useGoogleCalendar } from "@/contexts/GoogleCalendarContext";
import { useTaskContext } from "@/contexts/TaskContext";
import { addDays as dfnsAddDays, addMinutes, getDay, getHours, getMinutes, isBefore, isValid, parseISO, set, startOfDay } from "date-fns";
import { estimateDuration } from "@/lib/gemini";
import { Loader2 } from "lucide-react";

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

interface AutoSchedulePopupProps {
  open: boolean;
  onClose: () => void;
  section: "today" | "tomorrow" | "someday";
  unscheduledTasks: Task[];
}

export default function AutoSchedulePopup({ open, onClose, section, unscheduledTasks }: AutoSchedulePopupProps) {
  const [isScheduling, setIsScheduling] = useState(false);
  const { isConnected, calendars, fetchEvents } = useGoogleCalendar();
  const { tasks, updateTask } = useTaskContext();

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
      const convertedGoogleEvents: CalendarTimeSlot[] = googleEvents.map(event => ({
        start_time: event.start.dateTime,
        end_time: event.end.dateTime
      }));

      // Get scheduled tasks
      const scheduledTasks = tasks.filter(task => 
        task.start_time && 
        task.end_time
      );

      // Combine all events
      const allEvents = [...convertedGoogleEvents, ...scheduledTasks];

      // Start scheduling
      let startTime = section === "tomorrow"
        ? getStartOfBusinessHours(targetDate)
        : roundToNearestInterval(today);

      // Determine duration for each task
      const tasksWithDurations = [] as { task: Task; duration: number; isEmail: boolean }[];
      for (const task of unscheduledTasks) {
        const title = task.title.toLowerCase();
        const isEmail = /email|e-mail|send/.test(title);
        const isSlides = /slide|slides|prep|preparing|presentation/.test(title);
        let duration = 30;

        if (isEmail) {
          duration = 15;
        } else if (isSlides) {
          duration = 30;
        } else {
          duration = await estimateDuration(task.title);
        }

        tasksWithDurations.push({ task, duration, isEmail });
      }

      // Group email tasks together
      tasksWithDurations.sort((a, b) => Number(b.isEmail) - Number(a.isEmail));

      // Schedule each task
      for (const { task, duration } of tasksWithDurations) {
        const nextSlot = findNextAvailableSlot(startTime, duration, allEvents);
        if (nextSlot) {
          const endTime = addMinutes(nextSlot, duration);
          await updateTask(task.id, {
            ...task,
            start_time: nextSlot.toISOString(),
            end_time: endTime.toISOString()
          });
          allEvents.push({
            ...task,
            start_time: nextSlot.toISOString(),
            end_time: endTime.toISOString()
          });
          startTime = endTime;
        }
      }

      onClose();
    } catch (error) {
      console.error("Error auto-scheduling tasks:", error);
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!max-w-[380px] w-[calc(100%-1rem)] !sm:max-w-[380px] rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">Let us put these in your calendar for you?</DialogTitle>
          <DialogDescription className="text-sm">
            We'll schedule them for the next available slots, keeping your lunch free!
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <h4 className="mb-1.5 font-medium text-sm">Tasks to be scheduled:</h4>
          <ul className="space-y-1">
            {unscheduledTasks.map(task => (
              <li key={task.id} className="text-sm text-gray-600 flex">
                <span className="mr-2 flex-shrink-0">•</span>
                <span>{task.title}</span>
              </li>
            ))}
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
  );
} 