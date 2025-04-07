import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import CalendarComponent from "@/components/Calendar";
import { Task } from "@shared/schema";
import { useTaskContext } from "@/contexts/TaskContext";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";

export default function CalendarPage() {
  const { tasks, isLoading: tasksLoading, error: tasksError } = useTaskContext();
  const [key, setKey] = useState(0); // Used to force refresh calendar
  const [location] = useLocation();
  const [scheduledTaskId, setScheduledTaskId] = useState<number | null>(null);

  // Extract task ID from URL if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get("taskId");
    if (taskId) {
      setScheduledTaskId(parseInt(taskId));
    } else {
      setScheduledTaskId(null);
    }
  }, [location]);

  // Force refresh function for the calendar
  const handleRefetch = () => {
    setKey(prevKey => prevKey + 1);
  };

  if (tasksLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-white text-gray-800">
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        </main>
      </div>
    );
  }

  if (tasksError) {
    return (
      <div className="min-h-screen flex flex-col bg-white text-gray-800">
        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <h2 className="text-xl font-bold text-red-500 mb-2">Error Loading Tasks</h2>
          <p className="text-gray-600 mb-4">There was a problem loading your tasks.</p>
          <Button asChild>
            <Link to="/" className="flex items-center">
              <Calendar className="mr-2 h-4 w-4" />
              Back to Tasks
            </Link>
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-800">
      <main className="flex-1 overflow-hidden">
        <CalendarComponent 
          key={key}
          tasks={tasks}
          onRefetch={handleRefetch}
          scheduledTaskId={scheduledTaskId}
        />
      </main>
    </div>
  );
}