import { useState } from "react";
import { useTaskContext } from "@/contexts/TaskContext";
import TaskCard from "./TaskCard";
import AddTaskModal from "./AddTaskModal";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  CheckCircle, 
  AlertCircle, 
  ArrowUpDown, 
  Filter
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";

export default function TaskGrid() {
  const { 
    filteredTasks, 
    isLoading, 
    error, 
    viewTitle, 
    setSortOrder,
    sortOrder 
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

  // Get the sort label for display
  const getSortLabel = () => {
    switch(sortOrder) {
      case 'priority':
        return 'Priority';
      case 'dueDate':
        return 'Due Date';
      case 'energy':
        return 'Energy Level';
      case 'time':
        return 'Time Required';
      default:
        return 'Sort';
    }
  };

  return (
    <div className="flex-1">
      {/* Dashboard Header */}
      <div className="flex flex-wrap justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 mb-2 md:mb-0">{viewTitle}</h2>
        <div className="flex space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex gap-1 items-center">
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{getSortLabel()}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
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
          
          <Button 
            size="sm" 
            onClick={() => setShowNewTaskModal(true)}
            className="hidden md:flex"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Task List/Grid */}
      {filteredTasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      ) : (
        <div className="py-10 flex flex-col items-center justify-center bg-gray-50 rounded-lg">
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

      {/* Floating action button for mobile */}
      <div className="fixed right-5 bottom-5 md:hidden">
        <Button 
          onClick={() => setShowNewTaskModal(true)}
          className="h-12 w-12 rounded-full shadow-lg"
          size="icon"
        >
          <Plus className="h-5 w-5" />
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
