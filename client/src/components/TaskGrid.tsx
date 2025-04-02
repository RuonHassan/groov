import { useState } from "react";
import { useTaskContext } from "@/contexts/TaskContext";
import TaskCard from "./TaskCard";
import NewTaskCard from "./NewTaskCard";
import AddTaskModal from "./AddTaskModal";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  CheckCircle, 
  AlertCircle
} from "lucide-react";

export default function TaskGrid() {
  const { 
    filteredTasks, 
    isLoading, 
    error
  } = useTaskContext();
  
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-10 w-10 text-destructive mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Error loading tasks</h3>
        <p className="mt-1 text-sm text-gray-500">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white">
      {/* Task List */}
      {filteredTasks.length > 0 ? (
        <div className="flex flex-col divide-y divide-gray-100">
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
          {/* New Task Card at the end of the list */}
          <NewTaskCard />
        </div>
      ) : (
        <div className="py-10 flex flex-col items-center justify-center">
          <CheckCircle className="h-10 w-10 text-gray-300" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding a new task.</p>
          <div className="mt-4">
            <Button 
              onClick={() => setShowNewTaskModal(true)}
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          </div>
        </div>
      )}

      {/* Task Modal */}
      <AddTaskModal
        open={showNewTaskModal}
        onClose={() => setShowNewTaskModal(false)}
      />
    </div>
  );
}
