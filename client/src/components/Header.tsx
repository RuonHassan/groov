import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  LogOut,
  Settings
} from "lucide-react";
import WeeklyReviewModal from "./WeeklyReviewModal";
import { format, startOfWeek, isSameWeek, addWeeks } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link, useRoute } from "wouter";
import { useWeek } from "@/contexts/WeekContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import GoogleCalendarButton from "./GoogleCalendarButton";

export default function Header() {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isOnCalendar] = useRoute("/calendar");
  const { currentDate, goToPreviousWeek, goToNextWeek } = useWeek();
  const { user, signOut } = useAuth();

  // Calculate which week we're looking at
  const getWeekIndicator = () => {
    const today = new Date();
    const todayWeekStart = startOfWeek(today);
    const nextWeekStart = addWeeks(todayWeekStart, 1);
    
    if (isSameWeek(currentDate, today)) {
      return "This Week";
    } else if (isSameWeek(currentDate, nextWeekStart)) {
      return "Next Week";
    } else {
      return "Future";
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      // Navigation handled by AuthContext and PrivateRoute
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <header className="bg-white border-b-5 border-b-gray-800">
      <div className="w-full mx-auto px-4">
        <div className="flex justify-between items-center h-14">
          {/* Left side - Navigation links */}
          <div className="flex-1 flex justify-start items-center space-x-2">
            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                >
                  <User className="h-5 w-5" strokeWidth={3} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center cursor-pointer">
                  <User className="mr-2 h-4 w-4" strokeWidth={2.5} />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" strokeWidth={2.5} />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="p-2">
                  <GoogleCalendarButton />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="flex items-center text-red-600 cursor-pointer"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" strokeWidth={2.5} />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Calendar Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost"
                    size="icon"
                    asChild
                    className={`rounded-full ${isOnCalendar ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    <Link to={isOnCalendar ? "/app" : "/calendar"}>
                      <Calendar className="h-5 w-5" strokeWidth={3} />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isOnCalendar ? 'View Tasks' : 'View Calendar'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Center - Logo */}
          <div className="flex-1 flex justify-center">
            <Link to="/app">
              <img 
                src="/groov.png" 
                alt="Groov Logo" 
                className="h-10 w-auto cursor-pointer"
              />
            </Link>
          </div>
          
          {/* Right side - Week Navigation */}
          <div className="flex-1 flex justify-end items-center">
            {/* Week Navigation - More compact on mobile */}
            <div className="flex items-center">
              <Button 
                variant="ghost"
                size="icon"
                onClick={goToPreviousWeek}
                className="h-8 w-8 rounded-full flex-shrink-0"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
              </Button>

              <Badge 
                variant="outline" 
                className="px-2 md:px-3 mx-0.5 md:mx-1 h-7 bg-white text-xs md:text-sm whitespace-nowrap font-medium flex items-center justify-center"
              >
                {getWeekIndicator()}
              </Badge>
              
              <Button 
                variant="ghost"
                size="icon"
                onClick={goToNextWeek}
                className="h-8 w-8 rounded-full flex-shrink-0"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Review Modal */}
      <WeeklyReviewModal open={showReviewModal} onClose={() => setShowReviewModal(false)} />
    </header>
  );
}
