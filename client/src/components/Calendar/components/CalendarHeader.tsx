import React from 'react';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CalendarHeaderProps } from '../utils/types';

export function CalendarHeader({
  weekStart,
  weekEnd,
  goToPreviousThreeDays,
  goToNextThreeDays
}: CalendarHeaderProps) {
  return (
    <div className="flex items-center justify-between p-2 relative">
      <span className="font-semibold text-xl">
        {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
      </span>
      
      <div className="md:hidden flex items-center space-x-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={goToPreviousThreeDays}
          className="p-1"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={goToNextThreeDays}
          className="p-1"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0">
        <div className="mx-1 h-[2.5px] bg-gray-800 rounded-full" />
      </div>
    </div>
  );
} 