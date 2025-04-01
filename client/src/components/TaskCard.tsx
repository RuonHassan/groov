import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Clock, 
  Calendar,
  Pencil
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
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

  // Function to get border color based on task status
  const getBorderColor = () => {
    switch(task.status) {
      case "next":
        return "border-primary-500";
      case "waiting":
        return "border-amber-500";
      case "someday":
        return "border-gray-400";
      case "done":
        return "border-green-500";
      case "project":
        return "border-purple-500";
      default:
        return "border-gray-200";
    }
  };

  // Function to get context badge color
  const getContextColor = () => {
    switch(task.context) {
      case "work":
        return "bg-primary-50 text-primary-700";
      case "home":
        return "bg-green-50 text-green-700";
      case "errands":
        return "bg-amber-50 text-amber-700";
      case "calls":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Function to format task status for display
  const formatStatus = () => {
    switch(task.status) {
      case "next":
        return "Next Action";
      case "waiting":
        return "Waiting For";
      case "someday":
        return "Someday/Maybe";
      case "project":
        return "Project";
      case "inbox":
        return "Inbox";
      default:
        return task.status;
    }
  };

  // Format the date
  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return "";
    return format(new Date(dateString), "MMM d, yyyy");
  };

  return (
    <>
      <Card className={cn(
        "task-card overflow-hidden border-t-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-md",
        getBorderColor()
      )}>
        <div className="p-4">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-medium text-gray-900 line-clamp-2">{task.title}</h3>
            <div className="flex space-x-1">
              <button 
                onClick={handleComplete}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-green-500"
              >
                <CheckCircle className="h-5 w-5" />
              </button>
              <button 
                onClick={() => setShowEditModal(true)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-primary-500"
              >
                <Pencil className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline" className={getContextColor()}>
              {task.context}
            </Badge>
            
            <Badge variant="outline" className="bg-gray-100 text-gray-800">
              {formatStatus()}
            </Badge>
            
            {task.time && (
              <Badge variant="outline" className="bg-gray-100 text-gray-800 flex items-center">
                <Clock className="mr-1 h-3 w-3 text-gray-500" />
                {task.time} min
              </Badge>
            )}
            
            {task.energy && (
              <Badge variant="outline" className="bg-gray-100 text-gray-800">
                Energy: {task.energy}
              </Badge>
            )}
          </div>
          
          {task.notes && (
            <p className="mt-2 text-sm text-gray-600 line-clamp-2">{task.notes}</p>
          )}
          
          {task.dueDate && (
            <div className="mt-3 flex items-center text-sm text-gray-500">
              <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
              <span>{formatDate(task.dueDate)}</span>
            </div>
          )}
        </div>
        
        {task.delegatedTo && (
          <div className="bg-gray-50 px-4 py-2 border-t border-gray-100">
            <div className="flex items-center text-sm">
              <span className="text-gray-500 mr-1">Delegated to:</span>
              <span className="font-medium text-gray-800">{task.delegatedTo}</span>
            </div>
          </div>
        )}
      </Card>

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
