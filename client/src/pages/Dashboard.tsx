import { useTaskContext } from "@/contexts/TaskContext";
import TaskGrid from "@/components/TaskGrid";
import Calendar from "@/components/Calendar/Calendar";

export default function Dashboard() {
  const { isLoading, tasks } = useTaskContext();

  return (
    <div className="flex flex-col min-h-screen bg-white md:bg-gray-100">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4 p-4">
        {/* Tasks Section - Always Visible */}
        <div className="overflow-y-auto bg-white md:rounded-lg md:shadow">
          <TaskGrid />
        </div>

        {/* Calendar Section - Hidden on Mobile */}
        <div className="hidden md:block bg-white rounded-lg shadow overflow-y-auto">
          <Calendar 
            tasks={tasks}
          />
        </div>
      </div>
    </div>
  );
}
