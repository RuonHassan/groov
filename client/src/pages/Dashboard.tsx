import { useTaskContext } from "@/contexts/TaskContext";
import TaskGrid from "@/components/TaskGrid";
import CalendarComponent from "@/components/Calendar";

export default function Dashboard() {
  const { isLoading, tasks, refetchTasks } = useTaskContext();
  const { scheduledTaskId } = useTaskContext();

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4 p-4 h-[calc(100vh-4rem)] overflow-hidden">
        {/* Tasks Section - Always Visible */}
        <div className="overflow-y-auto no-scrollbar bg-white rounded-lg shadow">
          <TaskGrid />
        </div>

        {/* Calendar Section - Hidden on Mobile */}
        <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
          <CalendarComponent 
            tasks={tasks}
            onRefetch={refetchTasks}
            scheduledTaskId={scheduledTaskId}
          />
        </div>
      </div>
    </div>
  );
}
