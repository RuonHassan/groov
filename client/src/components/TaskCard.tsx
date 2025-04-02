import { useState } from "react";
import { useLocation } from "wouter";
import { 
  CheckCircle, 
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
  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the card click from triggering
    await updateTask(task.id, { status: "done" });
  };

  // Function to navigate to calendar with task ID
  const handleSchedule = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the card click from triggering
    setLocation(`/calendar?taskId=${task.id}`);
  };

  // Function to open the edit modal
  const handleCardClick = () => {
    setShowEditModal(true);
  };

  return (
    <>
      <div 
        className="border-b border-gray-100 w-full hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="flex items-center py-3 px-2">
          <div className="flex-grow">
            <h3 className="text-base text-gray-900 leading-tight truncate">
              {task.title}
            </h3>
          </div>
          
          <div className="flex items-center space-x-1 ml-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSchedule}
                    className="h-7 px-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Calendar className="h-3.5 w-3.5 mr-1" />
                    <span className="text-xs">Schedule</span>
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
                    size="sm"
                    onClick={handleComplete}
                    className="h-7 px-2 text-green-500 hover:text-green-700 hover:bg-green-50"
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    <span className="text-xs">Complete</span>
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
