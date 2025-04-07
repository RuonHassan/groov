import { useState, useMemo } from "react";
import { useTaskContext } from "@/contexts/TaskContext";
import TaskCard from "./TaskCard";
import NewTaskCard from "./NewTaskCard";
import { AlertCircle, Plus } from "lucide-react";
import { Task } from "@shared/schema";
import { isToday, isTomorrow, parseISO, format, isValid, startOfDay, addMinutes, addDays as dfnsAddDays, isBefore, isSameDay, isAfter } from "date-fns";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

// Helper function to find the next available 30-min slot
const findNextAvailableSlot = (date: Date, existingTasks: Task[]): Date => {
  let startTime = date;
  const maxEndTime = dfnsAddDays(startOfDay(date), 1); // Don't schedule past midnight

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

  // If no slot found before midnight, return null or handle appropriately
  // For now, return the original requested time (might overlap)
  console.warn("Could not find an available slot, defaulting to original time.");
  return date; 
};

export default function TaskGrid() {
  const { isLoading, tasks, addTask } = useTaskContext();
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState("");
  const [activeQuickAdd, setActiveQuickAdd] = useState<"today" | "tomorrow" | null>(null);

  // Organize tasks into Today, Tomorrow, Future, Someday
  const organizedTasks = useMemo(() => {
    const today = startOfDay(new Date());
    const tomorrow = startOfDay(dfnsAddDays(today, 1));
    const dayAfterTomorrow = startOfDay(dfnsAddDays(today, 2));

    // Filter out completed tasks FIRST
    const activeTasks = tasks.filter(task => !task.completed_at); 

    // Now categorize the remaining active tasks
    return activeTasks.reduce(
      (acc, task) => {
        if (task.start_time) {
          const startTimeDate = startOfDay(parseISO(task.start_time));
          if (isSameDay(startTimeDate, today)) {
            acc.today.push(task);
          } else if (isSameDay(startTimeDate, tomorrow)) {
            acc.tomorrow.push(task);
          } else if (isBefore(startTimeDate, today) || isAfter(startTimeDate, tomorrow)) {
             // Tasks in the past (before today) or more than 1 day in the future
             // Let's refine this slightly: if it's before today but *not* completed, maybe it belongs in Today?
             // For now, keeping original logic: Past or >1 day future -> Future
             // OR should past due tasks maybe show in 'Today' or a separate 'Overdue' section?
             // Current logic puts past due tasks into 'Future'.
             // Let's stick with Future for now for simplicity, but could revisit.
             acc.future.push(task); 
          } 
          // If start_time exists but doesn't match today/tomorrow/future, it implicitly falls out
          // This shouldn't happen with the current logic, but good to be aware of.
        } else {
          // Tasks without a start_time go to Someday
          acc.someday.push(task);
        }
        return acc;
      },
      { today: [] as Task[], tomorrow: [] as Task[], future: [] as Task[], someday: [] as Task[] }
    );
  }, [tasks]); // Dependency is the main tasks list

  // Quick Add handler with slot finding
  const handleQuickAddKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>, section: "today" | "tomorrow") => {
    if (e.key === "Enter" && quickTaskTitle.trim()) {
      let initialStartTime: Date;
      
      if (section === "today") {
        // Start from current time for today
        initialStartTime = new Date(); 
        // Optional: Round initialStartTime to nearest 15/30 min if desired
        // initialStartTime.setMinutes(Math.ceil(initialStartTime.getMinutes() / 30) * 30, 0, 0);
      } else { // Tomorrow
        // Start from beginning of tomorrow (e.g., 8 AM)
        initialStartTime = startOfDay(dfnsAddDays(new Date(), 1));
        initialStartTime.setHours(8, 0, 0, 0); // Set to 8:00 AM
      }

      // Find the next available slot using the helper function
      const availableStartTime = findNextAvailableSlot(initialStartTime, tasks);
      const availableEndTime = addMinutes(availableStartTime, 30); // 30-minute duration

      // Use snake_case for payload keys matching DB schema
      const payload: Record<string, any> = {
        title: quickTaskTitle,
        // Set start_time and end_time (snake_case)
        start_time: availableStartTime.toISOString(),
        end_time: availableEndTime.toISOString(),   
        // Default color? Or leave null? Adding default blue for now.
        color: "#3b82f6", 
        // Removed status field as it doesn't exist
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
  const renderSection = (title: string, tasks: Task[], section: "today" | "tomorrow" | "future" | "someday", alwaysShow: boolean = false) => {
    // Keep the condition to hide empty Future/Someday sections if not always shown
    if (tasks.length === 0 && !alwaysShow && section !== "today" && section !== "tomorrow") return null;

    // Determine if this section should have a Quick Add feature
    const canQuickAdd = section === "today" || section === "tomorrow";

    // Define the Quick Add UI elements directly (Button or Input)
    const quickAddUI = canQuickAdd ? (
      activeQuickAdd === section ? (
        <div className="px-4 py-3 border-t border-gray-100">
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
          className="px-4 py-3 border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
          onClick={() => setActiveQuickAdd(section)}
        >
          <Button
            variant={null}
            className="w-full justify-start text-gray-500 hover:text-gray-900 bg-transparent hover:bg-transparent p-0 h-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add task for {title.toLowerCase()}
          </Button>
        </div>
      )
    ) : null; // No Quick Add for Future/Someday

    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-900 px-4 py-3">{title}</h2>
        {tasks.length > 0 && (
           <div>
             {tasks.map((task) => (
               <TaskCard key={task.id} task={task} /> 
             ))}
           </div>
        )}
        {/* Render Quick Add UI (Button/Input with its own padding/border div) */}
        {quickAddUI}

        {/* Handle empty state message specifically for Future/Someday */}
        {tasks.length === 0 && !canQuickAdd && (
            <div className="px-4 py-2 border-b border-gray-100 text-sm text-gray-400 italic">
              No tasks {title === 'Someday' ? 'yet' : `for ${title.toLowerCase()}`}
            </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return <div className="p-4">Loading tasks...</div>;
  }

  return (
    <div className="w-full">
      {/* Check if there are ANY tasks before rendering sections - Maybe remove this check? */}
      {/* {tasks.length > 0 ? ( */}
        <>
          {/* Pass true to alwaysShow for all main sections */}
          {renderSection("Today", organizedTasks.today, "today", true)}
          {renderSection("Tomorrow", organizedTasks.tomorrow, "tomorrow", true)}
          {renderSection("Future", organizedTasks.future, "future", true)}
          {renderSection("Someday", organizedTasks.someday, "someday", true)}
          {/* Re-add NewTaskCard or similar mechanism here if desired */}
          <NewTaskCard />
        </>
      {/* ) : ( ... empty state ... ) */} 
      {/* Remove the overall empty state if sections always show */}
      {/* {tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-gray-500 p-6">
          <AlertCircle className="w-12 h-12 mb-2" />
          <p>No tasks yet!</p>
        </div>
      )} */}
    </div>
  );
}
