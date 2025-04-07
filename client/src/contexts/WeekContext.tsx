import React, { createContext, useContext, useState } from 'react';
import { addDays } from 'date-fns';

interface WeekContextType {
  currentDate: Date;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
}

const WeekContext = createContext<WeekContextType | undefined>(undefined);

export function WeekProvider({ children }: { children: React.ReactNode }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const goToPreviousWeek = () => {
    setCurrentDate(prevDate => addDays(prevDate, -7));
  };

  const goToNextWeek = () => {
    setCurrentDate(prevDate => addDays(prevDate, 7));
  };

  return (
    <WeekContext.Provider value={{ currentDate, goToPreviousWeek, goToNextWeek }}>
      {children}
    </WeekContext.Provider>
  );
}

export function useWeek() {
  const context = useContext(WeekContext);
  if (context === undefined) {
    throw new Error('useWeek must be used within a WeekProvider');
  }
  return context;
} 