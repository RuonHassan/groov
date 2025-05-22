import { useState, useMemo } from "react";
import { Task } from "@shared/schema";
import { useTaskContext } from "@/contexts/TaskContext";
import { useWeek } from "@/contexts/WeekContext";
import { format, isToday, isTomorrow, parseISO, isValid, startOfDay, addMinutes, addDays as dfnsAddDays, isBefore, isSameDay, isAfter, getDay, getHours, set, getMinutes } from "date-fns";
import { Plus, Calendar, MoreHorizontal, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AddTaskModal from "./AddTaskModal";
import TaskItem from "./TaskItem";
import NewTaskCard from "./NewTaskCard";
import CompletedTasksPopup from "./CompletedTasksPopup";
import { useCalendar } from "@/contexts/CalendarContext";
import AutoSchedulePopup from "./AutoSchedulePopup";

// Add type for calendar events
type CalendarTimeSlot = {
  start_time: string;
  end_time: string;
};

// Constants for business hours
const BUSINESS_START_HOUR = 9; // 9 AM
const BUSINESS_END_HOUR = 17;  // 5 PM
const MINUTES_INTERVAL = 15;   // 15-minute intervals

// Helper function to round time to nearest 15-minute interval
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

// Helper function to get next business day
const getNextBusinessDay = (date: Date): Date => {
  let nextDay = dfnsAddDays(date, 1);
  const dayOfWeek = getDay(nextDay);
  
  // If it's Saturday (6) or Sunday (0), move to Monday
  if (dayOfWeek === 6) { // Saturday
    nextDay = dfnsAddDays(nextDay, 2);
  } else if (dayOfWeek === 0) { // Sunday
    nextDay = dfnsAddDays(nextDay, 1);
  }
  
  return startOfDay(nextDay);
};

// Helper function to check if time is within business hours
const isWithinBusinessHours = (date: Date): boolean => {
  const hour = getHours(date);
  return hour >= BUSINESS_START_HOUR && hour < BUSINESS_END_HOUR;
};

// Helper function to get start of business hours for a given date
const getStartOfBusinessHours = (date: Date): Date => {
  return set(date, { hours: BUSINESS_START_HOUR, minutes: 0, seconds: 0, milliseconds: 0 });
};

// Helper function to get end of business hours for a given date
const getEndOfBusinessHours = (date: Date): Date => {
  return set(date, { hours: BUSINESS_END_HOUR, minutes: 0, seconds: 0, milliseconds: 0 });
};

// Helper function to find the next available 30-min slot
// Returns null if no slot found within the day constraint
const findNextAvailableSlot = (date: Date, existingEvents: (CalendarTimeSlot | Task)[]): Date | null => {
  // First, round the start time to the next 15-minute interval
  let startTime = roundToNearestInterval(date);
  
  // If current time is before business hours, start at beginning of business hours
  if (getHours(startTime) < BUSINESS_START_HOUR) {
    startTime = getStartOfBusinessHours(startTime);
  }
  
  // If current time is after business hours or it's weekend, move to next business day
  if (getHours(startTime) >= BUSINESS_END_HOUR || [0, 6].includes(getDay(startTime))) {
    startTime = getStartOfBusinessHours(getNextBusinessDay(startTime));
  }

  // Maximum number of days to look ahead (e.g., 2 weeks)
  const MAX_DAYS_TO_CHECK = 14;
  let daysChecked = 0;

  while (daysChecked < MAX_DAYS_TO_CHECK) {
    // If we've reached end of business hours, move to next business day
    if (getHours(startTime) >= BUSINESS_END_HOUR) {
      startTime = getStartOfBusinessHours(getNextBusinessDay(startTime));
      daysChecked++;
      continue;
    }

    // Ensure we're always on a 15-minute interval
    startTime = roundToNearestInterval(startTime);
    const endTime = addMinutes(startTime, 30);
    let slotOccupied = false;

    // Check against existing events
    for (const event of existingEvents) {
      if (!event.start_time || !event.end_time) continue;
      try {
        const eventStart = parseISO(event.start_time);
        const eventEnd = parseISO(event.end_time);
        if (!isValid(eventStart) || !isValid(eventEnd)) continue;

        // Check for overlap
        if (isBefore(eventStart, endTime) && isBefore(startTime, eventEnd)) {
          slotOccupied = true;
          // Move startTime to the end of the conflicting event + 1 minute, then round to next 15-min interval
          startTime = roundToNearestInterval(addMinutes(eventEnd, 1));
          
          // If this pushes us past business hours, move to next business day
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
      // Double check we're on a 15-minute interval before returning
      return roundToNearestInterval(startTime);
    }

    // Move to next 15-minute slot
    startTime = addMinutes(startTime, MINUTES_INTERVAL);
  }

  console.warn(`Could not find an available slot within ${MAX_DAYS_TO_CHECK} business days`);
  return null;
};

export default function TaskGrid() {
  const { isLoading, tasks, addTask, updateTask } = useTaskContext();
  const { isConnected, calendars, fetchEvents } = useCalendar();
  const { week } = useWeek();
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState("");
  const [activeQuickAdd, setActiveQuickAdd] = useState<"today" | "tomorrow" | null>(null);
  const [showCompletedPopup, setShowCompletedPopup] = useState(false);
  const [showAutoSchedulePopup, setShowAutoSchedulePopup] = useState(false);
  const [autoScheduleSection, setAutoScheduleSection] = useState<"today" | "tomorrow">("today");

  // Organize tasks into Today, Tomorrow, Future, Someday, and Completed
  const organizedTasks = useMemo(() => {
    const today = startOfDay(new Date());
    const tomorrow = startOfDay(dfnsAddDays(today, 1));
    const dayAfterTomorrow = startOfDay(dfnsAddDays(today, 2));

    // First separate completed tasks
    const completedTasks = tasks.filter(task => task.completed_at);
    const activeTasks = tasks.filter(task => !task.completed_at);

    // Now categorize the remaining active tasks
    const organized = activeTasks.reduce(
      (acc, task) => {
        if (task.start_time) {
          const startTimeDate = startOfDay(parseISO(task.start_time));
          if (isBefore(startTimeDate, today)) {
            // Move overdue tasks to someday
            acc.someday.push(task);
          } else if (isSameDay(startTimeDate, today)) {
            acc.today.push(task);
          } else if (isSameDay(startTimeDate, tomorrow)) {
            acc.tomorrow.push(task);
          } else {
            acc.future.push(task);
          }
        } else {
          acc.someday.push(task);
        }
        return acc;
      },
      { today: [] as Task[], tomorrow: [] as Task[], future: [] as Task[], someday: [] as Task[] }
    );

    return { ...organized, completed: completedTasks };
  }, [tasks]);

  // Get unscheduled tasks for today and tomorrow
  const unscheduledTasks = useMemo(() => {
    const today = startOfDay(new Date());
    const tomorrow = startOfDay(dfnsAddDays(today, 1));
    
    return {
      today: organizedTasks.today.filter(task => !task.start_time || !task.end_time),
      tomorrow: organizedTasks.tomorrow.filter(task => !task.start_time || !task.end_time)
    };
  }, [organizedTasks]);

  // Quick Add handler
  const handleQuickAddKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>, section: "today" | "tomorrow") => {
    if (e.key === "Enter" && quickTaskTitle.trim()) {
      const today = new Date();
      const taskDate = section === "today" ? today : dfnsAddDays(today, 1);
      
      try {
        await addTask({
          title: quickTaskTitle,
          start_time: taskDate.toISOString(),
          color: "#6C584C",
        });
        setQuickTaskTitle("");
        setActiveQuickAdd(null);
      } catch (error) {
        console.error("Quick add failed:", error);
      }
    } else if (e.key === "Escape") {
      setQuickTaskTitle("");
      setActiveQuickAdd(null);
    }
  };

  // Update renderSection to include the auto-schedule button
  const renderSection = (title: string, tasks: Task[], section: "today" | "tomorrow" | "future" | "someday" | "completed", alwaysShow: boolean = false) => {
    // Keep the condition to hide empty Future/Someday sections if not always shown
    if (tasks.length === 0 && !alwaysShow && section !== "today" && section !== "tomorrow") return null;

    // Determine if this section should have a Quick Add feature
    const canQuickAdd = section === "today" || section === "tomorrow";
    const hasUnscheduledTasks = section === "today" || section === "tomorrow" 
      ? unscheduledTasks[section].length > 0 
      : false;

    // Special styling for completed section
    const isCompletedSection = section === "completed";
    const isTodaySection = section === "today";
    const sectionHeaderClasses = `font-semibold relative ${
      isCompletedSection 
        ? 'text-gray-500 text-sm py-1' 
        : 'text-gray-900 text-xl pb-1 pt-2'
    } pl-2 pr-4 flex items-end justify-between cursor-${isCompletedSection ? 'pointer' : 'default'}`;

    // Define the Quick Add UI elements directly (Button or Input)
    const quickAddUI = canQuickAdd ? (
      activeQuickAdd === section ? (
        <div className="px-4 py-3">
          <Input
            autoFocus
            placeholder={`Add task for ${title} & schedule...`}
            value={quickTaskTitle}
            onChange={(e) => setQuickTaskTitle(e.target.value)}
            onKeyDown={(e) => handleQuickAddKeyDown(e, section)}
            className="w-full"
          />
        </div>
      ) : (
        <div
          className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
          onClick={() => setActiveQuickAdd(section)}
        >
          <Button
            variant={null}
            className="w-full justify-start text-gray-500 hover:text-gray-900 bg-transparent hover:bg-transparent p-0 h-auto"
          >
            &nbsp;
          </Button>
        </div>
      )
    ) : null; // No Quick Add for Future/Someday

    return (
      <div>
        <div 
          className={sectionHeaderClasses}
          onClick={isCompletedSection ? () => setShowCompletedPopup(true) : undefined}
        >
          <div className="flex items-center justify-between w-full">
            <h2>{title}</h2>
            {hasUnscheduledTasks && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-transparent p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setAutoScheduleSection(section as "today" | "tomorrow");
                  setShowAutoSchedulePopup(true);
                }}
              >
                <Clock className="h-3.5 w-3.5" strokeWidth={3} />
              </Button>
            )}
          </div>
          {isCompletedSection && (
            <span className="text-xs font-normal">
              {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
            </span>
          )}
          {/* Hand-drawn border effect */}
          {!isCompletedSection && (
            <>
              {/* Bottom border only */}
              <div className="absolute bottom-0 left-0 right-0">
                <div className="mx-1 h-[2.5px] bg-gray-800 rounded-full" />
              </div>
            </>
          )}
          {/* Completed section borders */}
          {isCompletedSection && (
            <>
              <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gray-200" />
            </>
          )}
        </div>
        
        {(!isCompletedSection || showCompletedPopup) && (
          <>
            {tasks.length > 0 && (
              <div className={isCompletedSection ? 'opacity-75' : ''}>
                {tasks.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            )}
            {/* Empty container for spacing when no tasks */}
            {tasks.length === 0 && !isCompletedSection && (
              <div className="h-2" />
            )}
            {/* Render Quick Add UI (Button/Input with its own padding/border div) */}
            {quickAddUI}
          </>
        )}
      </div>
    );
  };

  if (isLoading) {
    return <div className="p-4">Loading tasks...</div>;
  }

  return (
    <div className="w-full flex flex-col h-full relative">
      <div className="flex-1 overflow-y-auto pb-16 md:pb-24">
        {renderSection("Today", organizedTasks.today, "today", true)}
        {renderSection("Tomorrow", organizedTasks.tomorrow, "tomorrow", true)}
        {renderSection("Future", organizedTasks.future, "future", true)}
        <div className="h-8" />
        {renderSection("Someday", organizedTasks.someday, "someday", true)}
        <NewTaskCard />
      </div>

      {/* Desktop: Show completed tasks section */}
      <div className="hidden md:block sticky bottom-0 bg-white border-t border-gray-200">
        <div 
          className="text-gray-500 text-sm py-1 pl-2 pr-4 flex items-end justify-between cursor-pointer"
          onClick={() => setShowCompletedPopup(true)}
        >
          <h2>Completed</h2>
          <span className="text-xs font-normal">
            {organizedTasks.completed.length} {organizedTasks.completed.length === 1 ? 'task' : 'tasks'}
          </span>
        </div>
      </div>

      {/* Completed Tasks Popup */}
      <CompletedTasksPopup
        tasks={tasks}
        open={showCompletedPopup}
        onClose={() => setShowCompletedPopup(false)}
      />

      <AutoSchedulePopup
        open={showAutoSchedulePopup}
        onClose={() => setShowAutoSchedulePopup(false)}
        section={autoScheduleSection}
        unscheduledTasks={unscheduledTasks[autoScheduleSection]}
      />
    </div>
  );
}
