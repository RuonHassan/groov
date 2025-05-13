import { useState, useEffect } from 'react';
import { addDays, startOfWeek, getDay } from 'date-fns';

export function useVisibleDays(currentDate: Date) {
  const [mobileViewOffset, setMobileViewOffset] = useState<'early' | 'late'>('early');
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  
  // Generate all week days
  const allWeekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  
  // Get visible days based on screen size and current view
  const getVisibleDays = () => {
    // On desktop, show all weekdays (Mon-Fri)
    if (window.innerWidth >= 768) {
      return allWeekDays.filter(day => {
        const dayOfWeek = getDay(day);
        return dayOfWeek !== 0 && dayOfWeek !== 6; // Exclude Sunday (0) and Saturday (6)
      });
    }
    
    // On mobile, show 3 days based on the current view offset
    return mobileViewOffset === 'early' ? allWeekDays.slice(0, 3) : allWeekDays.slice(2, 5);
  };

  const [visibleDays, setVisibleDays] = useState(getVisibleDays());

  // Update visible days when window is resized, date changes, or view offset changes
  useEffect(() => {
    const handleResize = () => {
      setVisibleDays(getVisibleDays());
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call

    return () => window.removeEventListener('resize', handleResize);
  }, [currentDate, mobileViewOffset]);

  // Set initial mobile view offset based on current day
  useEffect(() => {
    const currentDayOfWeek = getDay(currentDate);
    setMobileViewOffset(currentDayOfWeek >= 3 && currentDayOfWeek <= 5 ? 'late' : 'early');
  }, [currentDate]);

  // Mobile navigation functions
  const goToPreviousThreeDays = () => {
    if (mobileViewOffset === 'late') {
      // If showing Wed-Fri, go back to Mon-Wed of the same week
      setMobileViewOffset('early');
    } else {
      // If showing Mon-Wed, go to Wed-Fri of the previous week
      setMobileViewOffset('late');
    }
  };

  const goToNextThreeDays = () => {
    if (mobileViewOffset === 'early') {
      // If showing Mon-Wed, go to Wed-Fri of the same week
      setMobileViewOffset('late');
    } else {
      // If showing Wed-Fri, go to Mon-Wed of the next week
      setMobileViewOffset('early');
    }
  };

  return {
    visibleDays,
    mobileViewOffset,
    goToPreviousThreeDays,
    goToNextThreeDays
  };
} 