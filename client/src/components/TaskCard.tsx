import { useState } from "react";
import { Task } from "@shared/schema";
import { useTaskContext } from "@/contexts/TaskContext";
import AddTaskModal from "./AddTaskModal";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Calendar } from "lucide-react";

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  const { updateTask } = useTaskContext();
  const { toast } = useToast();
  const [showEditModal, setShowEditModal] = useState(false);

  const handleComplete = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await updateTask(task.id, { completed_at: new Date().toISOString() });
      toast({
        title: "Task completed",
        description: `"${task.title}" marked as done.`
      });
    } catch (error) {
      console.error("Failed to mark task complete:", error);
      toast({ title: "Error", description: "Failed to complete task.", variant: "destructive" });
    }
  };

  const handleEditTime = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowEditModal(true);
  };

  const handleCardClick = () => {
    setShowEditModal(true);
  };

  return (
    <>
      <motion.div
        className="flex items-center justify-between w-full py-3 px-4 bg-white border-b border-gray-100 cursor-pointer hover:bg-gray-50"
        onClick={handleCardClick}
        whileTap={{ scale: 0.99 }}
      >
        <h3 className="text-sm text-gray-900 truncate flex-1 mr-2">
          {task.title}
        </h3>
        
        <div className="flex items-center gap-1 ml-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleEditTime}
            className="h-7 w-7 rounded-full text-blue-500 hover:text-blue-700 hover:bg-blue-50"
            title="Edit time"
          >
            <Calendar className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => handleComplete(e)}
            className="h-7 w-7 rounded-full text-green-500 hover:text-green-700 hover:bg-green-50"
            title="Mark complete"
          >
            <CheckCircle className="h-4 w-4" />
          </Button>
        </div>

      </motion.div>

      <AddTaskModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        task={task}
        isEditing={true}
      />
    </>
  );
}
