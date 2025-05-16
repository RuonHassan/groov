import { useState } from "react";
import { Task } from "@shared/schema";
import { useTaskContext } from "@/contexts/TaskContext";
import AddTaskModal from "./AddTaskModal";
import { Button } from "@/components/ui/button";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, RotateCcw } from "lucide-react";

interface TaskCardProps {
  task: Task;
}

const SWIPE_THRESHOLD = -100;
const DELETE_THRESHOLD = 100;

export default function TaskCard({ task }: TaskCardProps) {
  const { updateTask, deleteTask } = useTaskContext();
  const { toast } = useToast();
  const [showEditModal, setShowEditModal] = useState(false);

  const x = useMotionValue(0);
  const completeOpacity = useTransform(x, [-150, SWIPE_THRESHOLD], [1, 0.2]);
  const deleteOpacity = useTransform(x, [DELETE_THRESHOLD, 150], [0.2, 1]);
  const completeScale = useTransform(x, [SWIPE_THRESHOLD, 0], [1, 0.5]);
  const deleteScale = useTransform(x, [0, DELETE_THRESHOLD], [0.5, 1]);

  const handleComplete = async (e?: React.MouseEvent | PanInfo) => {
    if (e && 'stopPropagation' in e) e.stopPropagation();
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

  const handleRestore = async (e: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await updateTask(task.id, { completed_at: null });
      toast({
        title: "Task restored",
        description: `"${task.title}" has been restored.`
      });
    } catch (error) {
      console.error("Failed to restore task:", error);
      toast({ title: "Error", description: "Failed to restore task.", variant: "destructive" });
    }
  };

  const handleDelete = async (e?: React.MouseEvent | PanInfo) => {
    if (e && 'stopPropagation' in e) e.stopPropagation();
    try {
      await deleteTask(task.id);
      toast({
        title: "Task deleted",
        description: `"${task.title}" has been deleted.`
      });
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast({ title: "Error", description: "Failed to delete task.", variant: "destructive" });
    }
  };

  const handleEditTime = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowEditModal(true);
  };

  const handleCardClick = () => {
    if (x.get() === 0) {
      setShowEditModal(true);
    }
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset < SWIPE_THRESHOLD || velocity < -500) {
      handleComplete(info);
    } else if (offset > DELETE_THRESHOLD || velocity > 500) {
      handleDelete(info);
    } else {
      x.set(0);
    }
  };

  return (
    <>
      <div className="relative bg-gray-100 overflow-hidden rounded-lg mb-0.5">
        <motion.div
          className="absolute inset-y-0 left-0 w-full bg-red-500 flex items-center justify-start px-6"
          style={{ opacity: deleteOpacity, pointerEvents: 'none' }}
        >
          {/* Icon removed */}
        </motion.div>
        
        <motion.div
          className="absolute inset-y-0 right-0 w-full bg-green-500 flex items-center justify-end px-6"
          style={{ opacity: completeOpacity, pointerEvents: 'none' }}
        >
          {/* Icon removed */}
        </motion.div>
        
        <motion.div
          drag={!task.completed_at ? "x" : undefined}
          style={{ x }}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className="relative flex items-center justify-between w-full py-1 px-2 bg-white border-b border-gray-100 cursor-pointer hover:bg-gray-50 z-10"
          onClick={handleCardClick}
          whileTap={{ scale: 0.99, cursor: "grabbing" }}
        >
          <h3 className="text-sm text-gray-900 truncate flex-1 select-none">
            {task.title}
          </h3>
          
          <div className="flex items-center ml-auto">
            {task.completed_at ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRestore}
                className="h-6 w-6 rounded-full flex-shrink-0"
                title="Restore task"
              >
                <RotateCcw className="h-3.5 w-3.5 text-gray-500 hover:text-gray-900" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => handleComplete(e)}
                className="h-6 w-6 rounded-full flex-shrink-0"
                title="Mark complete"
              >
                <CheckCircle className="h-3.5 w-3.5 text-black" />
              </Button>
            )}
          </div>

        </motion.div>
      </div>

      <AddTaskModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        task={task}
        isEditing={true}
      />
    </>
  );
}
