import { useState } from "react";
import { useTaskContext } from "@/contexts/TaskContext";
import TaskCard from "./TaskCard";
import AddTaskModal from "./AddTaskModal";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle, AlertCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function TaskGrid() {
  const { 
    filteredTasks, 
    isLoading, 
    error, 
    viewTitle, 
    setSortOrder 
  } = useTaskContext();
  
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Error loading tasks</h3>
        <p className="mt-1 text-sm text-gray-500">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="flex-1">
      {/* Dashboard Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">{viewTitle}</h2>
        <div className="flex space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortOrder("priority")}>
                Priority
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOrder("dueDate")}>
                Due Date
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOrder("energy")}>
                Energy Level
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOrder("time")}>
                Time Required
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button size="sm" onClick={() => setShowNewTaskModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Task Grid */}
      {filteredTasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      ) : (
        <div className="col-span-full py-12 flex flex-col items-center justify-center">
          <CheckCircle className="h-12 w-12 text-gray-300" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding a new task.</p>
          <div className="mt-6">
            <Button onClick={() => setShowNewTaskModal(true)}>
              <Plus className="mr-2 h-5 w-5" />
              Add Task
            </Button>
          </div>
        </div>
      )}

      {/* Floating action button for mobile */}
      <div className="fixed right-6 bottom-6 md:hidden">
        <Button 
          onClick={() => setShowNewTaskModal(true)}
          className="h-14 w-14 rounded-full shadow-lg"
          size="icon"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Task Modal */}
      <AddTaskModal
        open={showNewTaskModal}
        onClose={() => setShowNewTaskModal(false)}
      />
    </div>
  );
}
