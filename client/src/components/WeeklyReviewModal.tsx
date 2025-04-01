import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WeeklyReviewModalProps {
  open: boolean;
  onClose: () => void;
}

export default function WeeklyReviewModal({ open, onClose }: WeeklyReviewModalProps) {
  const { toast } = useToast();
  const [reviewItems, setReviewItems] = useState({
    emptyHead: false,
    processInboxes: false,
    reviewTodos: false,
    reviewProjects: false,
    reviewSomeday: false,
    reviewCalendar: false,
    reviewWaiting: false,
  });

  const handleCheckboxChange = (key: keyof typeof reviewItems) => {
    setReviewItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleCompleteReview = () => {
    // In a real app, you might save the review state
    toast({
      title: "Weekly Review Completed",
      description: "Your GTD system is now up to date!",
    });
    
    // Reset checkboxes and close modal
    setReviewItems({
      emptyHead: false,
      processInboxes: false,
      reviewTodos: false,
      reviewProjects: false,
      reviewSomeday: false,
      reviewCalendar: false,
      reviewWaiting: false,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Weekly Review</DialogTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-4 top-4"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-gray-500 mb-4">
            Complete the GTD weekly review checklist to ensure your system stays up to date.
          </p>
          
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="review-1" 
                checked={reviewItems.emptyHead}
                onCheckedChange={() => handleCheckboxChange('emptyHead')}
              />
              <div>
                <label 
                  htmlFor="review-1" 
                  className="font-medium text-sm text-gray-700 cursor-pointer"
                >
                  Empty your head
                </label>
                <p className="text-xs text-gray-500">
                  Write down all ideas, tasks, and thoughts that are on your mind
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="review-2" 
                checked={reviewItems.processInboxes}
                onCheckedChange={() => handleCheckboxChange('processInboxes')}
              />
              <div>
                <label 
                  htmlFor="review-2" 
                  className="font-medium text-sm text-gray-700 cursor-pointer"
                >
                  Process your inboxes
                </label>
                <p className="text-xs text-gray-500">
                  Assign new tasks and ideas to their appropriate place in the GTD system
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="review-3" 
                checked={reviewItems.reviewTodos}
                onCheckedChange={() => handleCheckboxChange('reviewTodos')}
              />
              <div>
                <label 
                  htmlFor="review-3" 
                  className="font-medium text-sm text-gray-700 cursor-pointer"
                >
                  Review to-do lists
                </label>
                <p className="text-xs text-gray-500">
                  Check if your lists are up to date and mark completed tasks
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="review-4" 
                checked={reviewItems.reviewProjects}
                onCheckedChange={() => handleCheckboxChange('reviewProjects')}
              />
              <div>
                <label 
                  htmlFor="review-4" 
                  className="font-medium text-sm text-gray-700 cursor-pointer"
                >
                  Review project lists
                </label>
                <p className="text-xs text-gray-500">
                  Check progress on projects and define next actions for each active project
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="review-5" 
                checked={reviewItems.reviewSomeday}
                onCheckedChange={() => handleCheckboxChange('reviewSomeday')}
              />
              <div>
                <label 
                  htmlFor="review-5" 
                  className="font-medium text-sm text-gray-700 cursor-pointer"
                >
                  Review Someday/Maybe list
                </label>
                <p className="text-xs text-gray-500">
                  Decide if any items should be moved to active projects
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="review-6" 
                checked={reviewItems.reviewCalendar}
                onCheckedChange={() => handleCheckboxChange('reviewCalendar')}
              />
              <div>
                <label 
                  htmlFor="review-6" 
                  className="font-medium text-sm text-gray-700 cursor-pointer"
                >
                  Review calendar
                </label>
                <p className="text-xs text-gray-500">
                  Check upcoming appointments and confirm all events are recorded
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="review-7" 
                checked={reviewItems.reviewWaiting}
                onCheckedChange={() => handleCheckboxChange('reviewWaiting')}
              />
              <div>
                <label 
                  htmlFor="review-7" 
                  className="font-medium text-sm text-gray-700 cursor-pointer"
                >
                  Review Waiting For list
                </label>
                <p className="text-xs text-gray-500">
                  Follow up on delegated tasks if needed
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={handleCompleteReview}>Complete Review</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
