import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  ClipboardCheck, 
  Settings,
} from "lucide-react";
import WeeklyReviewModal from "./WeeklyReviewModal";

export default function Header() {
  const [showReviewModal, setShowReviewModal] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <ClipboardCheck className="h-8 w-8 text-primary" />
            <h1 className="ml-2 text-xl font-semibold text-gray-900">GTD Task Manager</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline"
              onClick={() => setShowReviewModal(true)}
              className="flex items-center"
            >
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Weekly Review
            </Button>
            <Button 
              variant="outline"
              className="flex items-center"
              size="sm"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Weekly Review Modal */}
      <WeeklyReviewModal open={showReviewModal} onClose={() => setShowReviewModal(false)} />
    </header>
  );
}
