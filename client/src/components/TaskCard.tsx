import { useState } from "react";
import { useLocation } from "wouter";
import { 
  CheckCircle, 
  Pencil,
  Calendar
} from "lucide-react";
import { Task } from "@shared/schema";
import { useTaskContext } from "@/contexts/TaskContext";
import AddTaskModal from "./AddTaskModal";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  const { updateTask } = useTaskContext();
  const [showEditModal, setShowEditModal] = useState(false);
  const [, setLocation] = useLocation();

  // Function to mark a task as completed
  const handleComplete = async () => {
    await updateTask(task.id, { status: "done" });
  };

  // Function to navigate to calendar with task ID
  const handleSchedule = () => {
    setLocation(`/calendar?taskId=${task.id}`);
  };

  return (
    <>
      <div className="border-b border-gray-100 w-full">
        <div className="flex items-center py-4 px-2">
          <div className="flex-grow">
            <h3 className="text-base text-gray-900 leading-tight">
              {task.title}
            </h3>
            
            {/* Show context, priority, and due date if set */}
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
              {task.context && (
                <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                  {task.context}
                </span>
              )}
              
              {task.priority === "high" && (
                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  High Priority
                </span>
              )}
              
              {task.dueDate && (
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  Due: {task.dueDate.toString().slice(0, 10)}
                </span>
              )}
              
              {task.scheduled && (
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  Scheduled
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSchedule}
                    className="h-8 w-8 rounded-full text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Schedule Task</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowEditModal(true)}
                    className="h-8 w-8 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit Task</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleComplete}
                    className="h-8 w-8 rounded-full text-green-500 hover:text-green-700 hover:bg-green-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Complete Task</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <AddTaskModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        task={task}
        isEditing={true}
      />
    </>
  );
}
