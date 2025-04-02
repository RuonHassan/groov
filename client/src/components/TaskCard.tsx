import { useState } from "react";
import { useLocation } from "wouter";
import { 
  CheckCircle, 
  Calendar,
  ArrowRight
} from "lucide-react";
import { Task } from "@shared/schema";
import { useTaskContext } from "@/contexts/TaskContext";
import AddTaskModal from "./AddTaskModal";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, useAnimation, PanInfo } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  const { updateTask } = useTaskContext();
  const [showEditModal, setShowEditModal] = useState(false);
  const [, setLocation] = useLocation();
  const controls = useAnimation();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);

  // Function to mark a task as completed
  const handleComplete = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); // Prevent the card click from triggering
    await updateTask(task.id, { status: "done" });
    toast({
      title: "Task completed",
      description: `"${task.title}" has been marked as done`
    });
  };

  // Function to navigate to calendar with task ID
  const handleSchedule = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the card click from triggering
    setLocation(`/calendar?taskId=${task.id}`);
  };

  // Function to open the edit modal
  const handleCardClick = () => {
    if (!isDragging) {
      setShowEditModal(true);
    }
  };

  // Handle drag start
  const handleDragStart = () => {
    setIsDragging(true);
  };

  // Handle drag while in progress
  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Calculate drag progress percentage (0-100)
    const threshold = 100;
    const progress = Math.min(Math.max(0, (info.offset.x / threshold) * 100), 100);
    setDragProgress(progress);
  };

  // Handle swipe gesture completion
  const handleDragEnd = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100; // minimum drag distance to trigger action
    
    // If dragged far enough to the right
    if (info.offset.x > threshold) {
      // Move card off screen with animation
      await controls.start({ 
        x: window.innerWidth,
        opacity: 0,
        transition: { duration: 0.3 }
      });
      // Mark task as complete
      handleComplete();
    } else {
      // Return to original position if not dragged far enough
      controls.start({ 
        x: 0, 
        transition: { 
          type: "spring", 
          stiffness: 300, 
          damping: 20 
        } 
      });
    }
    
    // Reset states
    setIsDragging(false);
    setDragProgress(0);
  };

  // Background gradient style based on drag progress
  const getCompletionBackground = () => {
    if (dragProgress <= 0) return {};
    return {
      background: `linear-gradient(to right, rgba(134, 239, 172, 0.2) 0%, rgba(74, 222, 128, 0.2) ${dragProgress}%, transparent ${dragProgress}%, transparent 100%)`
    };
  };

  return (
    <>
      {/* Card container with swipe functionality */}
      <div className="relative w-full overflow-hidden border-b border-gray-100">
        {/* Background color that shows during swipe */}
        <div 
          className="absolute inset-0 flex items-center justify-end px-4"
          style={getCompletionBackground()}
        >
          {dragProgress > 60 && (
            <div className="text-green-600 font-medium flex items-center">
              <CheckCircle className="h-4 w-4 mr-1" />
              <span>Release to complete</span>
            </div>
          )}
        </div>
        
        {/* The actual draggable card */}
        <motion.div 
          className="bg-white w-full hover:bg-gray-50 transition-colors cursor-pointer relative z-10"
          onClick={handleCardClick}
          drag="x"
          dragConstraints={{ left: 0, right: 200 }}
          dragElastic={0.1}
          dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          animate={controls}
          whileTap={{ cursor: "grabbing" }}
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
                      size="icon"
                      onClick={handleSchedule}
                      className="h-7 w-7 rounded-full text-blue-500 hover:text-blue-700 hover:bg-blue-50 flex-shrink-0"
                    >
                      <Calendar className="h-3.5 w-3.5" />
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
                      onClick={(e) => handleComplete(e)}
                      className="h-7 w-7 rounded-full text-green-500 hover:text-green-700 hover:bg-green-50 flex-shrink-0"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Complete Task</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </motion.div>
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
