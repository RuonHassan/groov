import { useState } from "react";
import { 
  CheckCircle, 
  Pencil
} from "lucide-react";
import { Task } from "@shared/schema";
import { useTaskContext } from "@/contexts/TaskContext";
import AddTaskModal from "./AddTaskModal";

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  const { updateTask } = useTaskContext();
  const [showEditModal, setShowEditModal] = useState(false);

  // Function to mark a task as completed
  const handleComplete = async () => {
    await updateTask(task.id, { status: "done" });
  };

  return (
    <>
      <div className="border-b border-gray-100 w-full">
        <div className="flex items-center py-4 px-2">
          <div className="flex-grow">
            <h3 className="text-base text-gray-900 leading-tight">
              {task.title}
            </h3>
          </div>
          
          <div className="flex items-center">
            <button 
              onClick={handleComplete}
              className="p-2 rounded-full text-gray-400 hover:text-green-500"
              aria-label="Mark as complete"
            >
              <CheckCircle className="h-6 w-6" />
            </button>
            
            <button 
              onClick={() => setShowEditModal(true)}
              className="p-2 rounded-full text-gray-400 hover:text-gray-500"
              aria-label="Edit task"
            >
              <Pencil className="h-5 w-5" />
            </button>
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
