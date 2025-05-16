import { useState, useMemo } from "react";
import { Task } from "@shared/schema";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import TaskCard from "./TaskCard";
import { startOfWeek, endOfWeek, isBefore, isAfter, parseISO, subWeeks, startOfDay } from "date-fns";

interface CompletedTasksPopupProps {
  tasks: Task[];
  open: boolean;
  onClose: () => void;
}

export default function CompletedTasksPopup({ tasks, open, onClose }: CompletedTasksPopupProps) {
  // Group completed tasks by time period
  const groupedTasks = useMemo(() => {
    const now = new Date();
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 }); // Start week on Monday
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

    return tasks.reduce((acc, task) => {
      // Only process completed tasks
      if (!task.completed_at || !task.start_time) return acc;
      
      const taskStartDate = startOfDay(parseISO(task.start_time));
      
      if (isAfter(taskStartDate, thisWeekStart) && !isAfter(taskStartDate, thisWeekEnd)) {
        acc.thisWeek.push(task);
      } else if (isAfter(taskStartDate, lastWeekStart) && !isAfter(taskStartDate, lastWeekEnd)) {
        acc.lastWeek.push(task);
      } else {
        acc.older.push(task);
      }
      
      return acc;
    }, {
      thisWeek: [] as Task[],
      lastWeek: [] as Task[],
      older: [] as Task[]
    });
  }, [tasks]);

  const renderSection = (title: string, tasks: Task[], isLastWeek: boolean = false, isOlder: boolean = false) => {
    if (tasks.length === 0) return null;

    return (
      <div className={`${(isLastWeek || isOlder) ? 'mt-6' : ''}`}>
        <div className="font-semibold relative text-gray-900 text-xl pb-1 pl-2 pr-4 flex items-end justify-between">
          <h2>{title}</h2>
          {/* Hand-drawn border effect */}
          <div className="absolute bottom-0 left-0 right-0">
            <div className="mx-1 h-[2.5px] bg-gray-800 rounded-full" />
          </div>
        </div>
        
        <div>
          {tasks.length > 0 && (
            <div>
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
          {tasks.length === 0 && (
            <div className="h-2" />
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl rounded-xl shadow-lg border-0">
        <div className="py-2">
          <div className="max-h-[80vh] overflow-y-auto no-scrollbar">
            {renderSection("This Week", groupedTasks.thisWeek)}
            {renderSection("Last Week", groupedTasks.lastWeek, true)}
            {renderSection("Older", groupedTasks.older, false, true)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 