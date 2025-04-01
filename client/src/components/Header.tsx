import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  ClipboardCheck, 
  Settings,
  Menu
} from "lucide-react";
import WeeklyReviewModal from "./WeeklyReviewModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Header() {
  const [showReviewModal, setShowReviewModal] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 md:h-16">
          <div className="flex items-center">
            <ClipboardCheck className="h-6 w-6 md:h-7 md:w-7 text-primary" />
            <h1 className="ml-2 text-lg md:text-xl font-semibold text-gray-900">GTD Manager</h1>
          </div>
          
          {/* Desktop buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Button 
              variant="outline"
              onClick={() => setShowReviewModal(true)}
              className="flex items-center"
              size="sm"
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
          
          {/* Mobile menu */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowReviewModal(true)}>
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  Weekly Review
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Weekly Review Modal */}
      <WeeklyReviewModal open={showReviewModal} onClose={() => setShowReviewModal(false)} />
    </header>
  );
}
