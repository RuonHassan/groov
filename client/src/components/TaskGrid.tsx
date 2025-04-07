import { useState } from "react";
import { useTaskContext } from "@/contexts/TaskContext";
import TaskCard from "./TaskCard";
import NewTaskCard from "./NewTaskCard";
import { AlertCircle, Plus } from "lucide-react";
import { Task } from "@shared/schema";
import { isToday, isTomorrow, parseISO, format, isValid, startOfDay, addMinutes, addDays as dfnsAddDays, isBefore } from "date-fns";
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

  // Organize tasks into sections based on startTime
  const organizedTasks = tasks.reduce((acc: { 
    today: Task[], 
    tomorrow: Task[], 
    future: Task[], 
    someday: Task[] 
  }, task) => {
    // Use updated Task type (should be camelCase from schema)
    let relevantDate: Date | null = null;
    try {
      // Check start_time (snake_case) from fetched data
      if (task.start_time && isValid(parseISO(task.start_time))) { 
        relevantDate = parseISO(task.start_time);
      } 
      // No else if for dueDate as it's removed
    } catch (e) {
      console.error("Error parsing start_time for task:", task, e);
    }

    if (relevantDate) {
      if (isToday(relevantDate)) {
        acc.today.push(task);
      } else if (isTomorrow(relevantDate)) {
        acc.tomorrow.push(task);
      } else {
        // startTime is valid but after tomorrow
        acc.future.push(task); 
      }
    } else {
      // Task has no valid startTime - categorize as Someday
      acc.someday.push(task); 
    }

    return acc;
  }, { today: [], tomorrow: [], future: [], someday: [] });

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

  // Update renderSection to re-enable Quick Add UI
  const renderSection = (title: string, tasks: Task[], section: "today" | "tomorrow" | "future" | "someday", alwaysShow: boolean = false) => {
    if (tasks.length === 0 && !alwaysShow && section !== "today" && section !== "tomorrow") return null; // Only hide Future/Someday if empty and not always shown

    // Check if the quick add input should be shown (only for Today/Tomorrow when empty)
    const showQuickAdd = (section === "today" || section === "tomorrow") && tasks.length === 0;

    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-900 px-4 py-3">{title}</h2>
        {tasks.length === 0 ? (
          <div className="px-4 py-2 border-b border-gray-100">
             {/* Restore Quick Add UI */} 
             {showQuickAdd ? (
               activeQuickAdd === section ? (
                 <Input
                   autoFocus
                   placeholder={`Add task for ${title} & schedule...`}
                   value={quickTaskTitle}
                   onChange={(e) => setQuickTaskTitle(e.target.value)}
                   onKeyDown={(e) => handleQuickAddKeyDown(e, section)}
                   className="w-full"
                 />
               ) : (
                 <Button 
                   variant="ghost" 
                   className="w-full justify-start text-gray-500 hover:text-gray-900"
                   onClick={() => setActiveQuickAdd(section)}
                 >
                   <Plus className="h-4 w-4 mr-2" />
                   Add task for {title.toLowerCase()}
                 </Button>
               )
             ) : (
               <div className="text-sm text-gray-400 italic">No tasks {title === 'Someday' ? 'yet' : `for ${title.toLowerCase()}`}</div>
             )}
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} /> 
          ))
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
