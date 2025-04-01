import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft,
  ChevronRight,
  Filter
} from "lucide-react";
import WeeklyReviewModal from "./WeeklyReviewModal";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import Sidebar from "./Sidebar";

export default function Header() {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const today = new Date();
  const formattedDate = format(today, "MMM d");

  return (
    <header className="bg-white border-b border-gray-100">
      <div className="w-full mx-auto px-4">
        <div className="flex justify-between items-center h-14">
          {/* Left side - Date */}
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">{formattedDate}</h1>
          </div>
          
          {/* Right side - User and Navigation */}
          <div className="flex items-center space-x-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button 
                  variant="secondary"
                  size="icon"
                  className="rounded-full bg-purple-100 text-purple-900 hover:bg-purple-200 h-8 w-8"
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px]">
                <div className="pt-6">
                  <Sidebar />
                </div>
              </SheetContent>
            </Sheet>
            
            <Button 
              variant="secondary"
              size="icon"
              className="rounded-full bg-gray-800 text-white hover:bg-gray-700 h-8 w-8"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <Button 
              variant="secondary"
              size="icon"
              className="rounded-full bg-gray-800 text-white hover:bg-gray-700 h-8 w-8"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Weekly Review Modal */}
      <WeeklyReviewModal open={showReviewModal} onClose={() => setShowReviewModal(false)} />
    </header>
  );
}
