import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft,
  ChevronRight,
  Calendar,
  Timer
} from "lucide-react";
import WeeklyReviewModal from "./WeeklyReviewModal";
import { format, differenceInWeeks } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link, useRoute } from "wouter";
import { useWeek } from "@/contexts/WeekContext";

export default function Header() {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isOnCalendar] = useRoute("/calendar");
  const [isOnPomodoro] = useRoute("/pomodoro");
  const { currentDate, goToPreviousWeek, goToNextWeek } = useWeek();

  // Calculate which week we're looking at
  const getWeekIndicator = () => {
    const today = new Date();
    const weekDiff = differenceInWeeks(currentDate, today);
    
    switch (weekDiff) {
      case 0:
        return "This Week";
      case 1:
        return "Next Week";
      case 2:
        return "In 2 Weeks";
      default:
        return weekDiff > 2 ? "Future" : "Past";
    }
  };

  return (
    <header className="bg-white border-b border-gray-100">
      <div className="w-full mx-auto px-4">
        <div className="flex justify-between items-center h-14">
          {/* Left side - Navigation links */}
          <div className="flex-1 flex justify-start items-center space-x-2">
            {/* Calendar/Pomodoro Buttons - Moved here */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost"
                    size="icon"
                    asChild
                    className={`rounded-full ${isOnCalendar ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    <Link to={isOnCalendar ? "/" : "/calendar"}>
                      <Calendar className="h-5 w-5" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isOnCalendar ? 'View Tasks' : 'View Calendar'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost"
                    size="icon"
                    asChild
                    className={`rounded-full ${isOnPomodoro ? 'bg-green-100 text-green-700' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    <Link to={isOnPomodoro ? "/" : "/pomodoro"}>
                      <Timer className="h-5 w-5" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isOnPomodoro ? 'View Tasks' : 'Pomodoro Timer'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Center - Logo */}
          <div className="flex-1 flex justify-center">
            <Link to="/">
              <img 
                src="/groov.png" 
                alt="Groov Logo" 
                className="h-8 w-auto cursor-pointer"
              />
            </Link>
          </div>
          
          {/* Right side - Week Navigation and Filter */}
          <div className="flex-1 flex justify-end items-center space-x-2">
            <Button 
              variant="outline"
              size="icon"
              onClick={goToPreviousWeek}
              className="rounded-full h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Badge 
              variant="secondary" 
              className="min-w-[80px] justify-center bg-gray-100 text-gray-600 hover:bg-gray-100"
            >
              {getWeekIndicator()}
            </Badge>
            
            <Button 
              variant="outline"
              size="icon"
              onClick={goToNextWeek}
              className="rounded-full h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Weekly Review Modal */}
      <WeeklyReviewModal open={showReviewModal} onClose={() => setShowReviewModal(false)} />
    </header>
  );
}
