import { useState } from "react";
import { Task } from "@shared/schema";
import { useTaskContext } from "@/contexts/TaskContext";
import AddTaskModal from "./AddTaskModal";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  const [showEditModal, setShowEditModal] = useState(false);

  const handleCardClick = () => {
    setShowEditModal(true);
  };

  return (
    <>
      <motion.div
        className="flex items-center justify-between w-full py-3 px-4 bg-white border-b border-gray-100 cursor-pointer hover:bg-gray-50"
        style={{ borderLeft: `4px solid ${task.color || '#cccccc'}` }}
        onClick={handleCardClick}
        whileTap={{ scale: 0.99 }}
      >
        <h3 className="text-sm text-gray-900 truncate flex-1 mr-2">
          {task.title}
        </h3>
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
