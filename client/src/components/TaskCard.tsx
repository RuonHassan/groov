import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Clock, 
  Calendar,
  Pencil,
  ChevronRight
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
  const [expanded, setExpanded] = useState(false);

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

  // Format the date
  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return "";
    return format(new Date(dateString), "MMM d");
  };

  return (
    <>
      <Card 
        className={cn(
          "task-card overflow-hidden border-l-4 transition-all duration-200 hover:shadow-md",
          getBorderColor()
        )}
      >
        <div className="p-3">
          {/* Main task row with minimum info */}
          <div className="flex justify-between items-center">
            <div className="flex-1 min-w-0 mr-2">
              <h3 
                className="text-sm font-medium text-gray-900 truncate cursor-pointer"
                onClick={() => setExpanded(!expanded)}
              >
                {task.title}
              </h3>
              
              <div className="flex flex-wrap items-center gap-1 mt-1">
                <Badge 
                  variant="outline" 
                  className={cn("px-1.5 py-0 text-xs", getContextColor())}
                >
                  {task.context}
                </Badge>
                
                {task.dueDate && (
                  <div className="inline-flex items-center text-xs text-gray-500">
                    <Calendar className="mr-0.5 h-3 w-3 text-gray-400" />
                    <span>{formatDate(task.dueDate)}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              <button 
                onClick={handleComplete}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-green-500"
              >
                <CheckCircle className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setShowEditModal(true)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-primary-500"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {/* Expanded content */}
          {expanded && (
            <div className="mt-2 pt-2 border-t border-gray-100 space-y-2">
              {task.notes && (
                <p className="text-xs text-gray-600">{task.notes}</p>
              )}
              
              <div className="flex flex-wrap gap-1.5">
                {task.status && (
                  <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700">
                    {task.status === "next" ? "Next Action" : 
                     task.status === "waiting" ? "Waiting For" : 
                     task.status === "someday" ? "Someday/Maybe" : 
                     task.status === "project" ? "Project" : 
                     task.status === "inbox" ? "Inbox" : task.status}
                  </Badge>
                )}
                
                {task.time && (
                  <div className="flex items-center text-xs text-gray-500">
                    <Clock className="mr-0.5 h-3 w-3 text-gray-400" />
                    <span>{task.time} min</span>
                  </div>
                )}
                
                {task.energy && (
                  <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700">
                    Energy: {task.energy}
                  </Badge>
                )}
                
                {task.delegatedTo && (
                  <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700">
                    To: {task.delegatedTo}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
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
