import { useState, useMemo } from "react";
import { useTaskContext } from "@/contexts/TaskContext";
import TaskCard from "./TaskCard";
import NewTaskCard from "./NewTaskCard";
import { AlertCircle, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { Task } from "@shared/schema";
import { isToday, isTomorrow, parseISO, format, isValid, startOfDay, addMinutes, addDays as dfnsAddDays, isBefore, isSameDay, isAfter } from "date-fns";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

// Helper function to find the next available 30-min slot
// Returns null if no slot found within the day constraint
const findNextAvailableSlot = (date: Date, existingTasks: Task[]): Date | null => {
  let startTime = date;
  const maxEndTime = dfnsAddDays(startOfDay(date), 1); // Don't schedule past midnight of the *initial* date

  // Check slots every 30 minutes
  while (isBefore(startTime, maxEndTime)) {
    const endTime = addMinutes(startTime, 30);
    let slotOccupied = false;

    // Check against existing tasks
    for (const task of existingTasks) {
      if (!task.startTime || !task.endTime) continue; // Skip tasks without times
      try {
        const taskStart = parseISO(task.startTime);
        const taskEnd = parseISO(task.endTime);
        if (!isValid(taskStart) || !isValid(taskEnd)) continue;

        // Check for overlap: (TaskStart < SlotEnd) and (TaskEnd > SlotStart)
        if (isBefore(taskStart, endTime) && isBefore(startTime, taskEnd)) {
          slotOccupied = true;
          // Move startTime to the end of the conflicting task + 1 minute to check next slot
          startTime = addMinutes(taskEnd, 1); 
          break; // Found overlap, break inner loop to re-check while condition
        }
      } catch (e) {
        console.error("Error parsing task times during slot check:", task, e);
      }
    }

    if (!slotOccupied) {
      // Found an available slot
      return startTime; 
    }
    // If the slot was occupied, the startTime was already adjusted, 
    // so the while loop continues checking from the new startTime.
    // If startTime jumped past maxEndTime, loop will terminate.
  }

  // If loop finishes without returning, no slot was found before maxEndTime
  console.warn(`Could not find an available slot starting from ${format(date, 'Pp')}`);
  return null; 
};

export default function TaskGrid() {
  const { isLoading, tasks, addTask } = useTaskContext();
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState("");
  const [activeQuickAdd, setActiveQuickAdd] = useState<"today" | "tomorrow" | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

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

  // Quick Add handler with slot finding
  const handleQuickAddKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>, section: "today" | "tomorrow") => {
    if (e.key === "Enter" && quickTaskTitle.trim()) {
      // Set date based on section without specific time
      const today = new Date();
      
      // Create a date at the start of the day (midnight)
      let taskDate: Date;
      if (section === "today") {
        taskDate = startOfDay(today);
      } else { // tomorrow
        taskDate = startOfDay(dfnsAddDays(today, 1));
      }
      
      // Use snake_case for payload keys matching DB schema
      const payload: Record<string, any> = {
        title: quickTaskTitle,
        start_time: taskDate.toISOString(),
        color: "#3b82f6", // Default blue
      };

      try {
        await addTask(payload); 
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

  // Update renderSection to always show Quick Add UI below tasks for Today/Tomorrow
  const renderSection = (title: string, tasks: Task[], section: "today" | "tomorrow" | "future" | "someday" | "completed", alwaysShow: boolean = false) => {
    // Keep the condition to hide empty Future/Someday sections if not always shown
    if (tasks.length === 0 && !alwaysShow && section !== "today" && section !== "tomorrow") return null;

    // Determine if this section should have a Quick Add feature
    const canQuickAdd = section === "today" || section === "tomorrow";

    // Special styling for completed section
    const isCompletedSection = section === "completed";
    const sectionHeaderClasses = `font-semibold ${isCompletedSection ? 'text-gray-500 text-sm py-2' : 'text-gray-900 text-xl py-3'} px-4 border-t border-b ${isCompletedSection ? 'border-gray-200' : 'border-t-gray-200 border-b-black'} flex items-center justify-between cursor-${isCompletedSection ? 'pointer' : 'default'}`;

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
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )
    ) : null; // No Quick Add for Future/Someday

    return (
      <div>
        <div 
          className={sectionHeaderClasses}
          onClick={() => isCompletedSection && setShowCompleted(!showCompleted)}
        >
          <h2>{title}</h2>
          {isCompletedSection && (
            <span className="text-xs font-normal">
              {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
            </span>
          )}
        </div>
        
        {(!isCompletedSection || showCompleted) && (
          <>
            {tasks.length > 0 && (
              <div className={isCompletedSection ? 'opacity-75' : ''}>
                {tasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            )}
            {/* Render Quick Add UI (Button/Input with its own padding/border div) */}
            {quickAddUI}

            {/* Handle empty state message specifically for Future/Someday */}
            {tasks.length === 0 && !canQuickAdd && !isCompletedSection && (
              <div className="px-4 py-2 border-b border-gray-100 text-sm text-gray-400 italic">
                No tasks {title === 'Someday' ? 'yet' : `for ${title.toLowerCase()}`}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  if (isLoading) {
    return <div className="p-4">Loading tasks...</div>;
  }

  return (
    <div className="w-full">
      {renderSection("Today", organizedTasks.today, "today", true)}
      {renderSection("Tomorrow", organizedTasks.tomorrow, "tomorrow", true)}
      {renderSection("Future", organizedTasks.future, "future", true)}
      {renderSection("Someday", organizedTasks.someday, "someday", true)}
      {renderSection(`Completed`, organizedTasks.completed, "completed", true)}
      <NewTaskCard />
    </div>
  );
}
