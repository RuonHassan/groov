import React, { createContext, useContext, useState, useCallback } from 'react';

interface Calendar {
  id: string;
  summary: string;
  description?: string;
  timeZone: string;
}

interface GoogleCalendarContextType {
  isConnected: boolean;
  calendars: Calendar[];
  setCalendars: (calendars: Calendar[]) => void;
  setIsConnected: (connected: boolean) => void;
  fetchEvents: (calendarId: string, timeMin: Date, timeMax: Date) => Promise<any[]>;
}

const GoogleCalendarContext = createContext<GoogleCalendarContextType | undefined>(undefined);

export function GoogleCalendarProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [calendars, setCalendars] = useState<Calendar[]>([]);

  const fetchEvents = useCallback(async (calendarId: string, timeMin: Date, timeMax: Date) => {
    if (!window.gapi?.client?.calendar) {
      throw new Error('Google Calendar API not initialized');
    }

    try {
      const response = await window.gapi.client.calendar.events.list({
        calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        showDeleted: false,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.result.items;
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return [];
    }
  }, []);

  return (
    <GoogleCalendarContext.Provider 
      value={{ 
        isConnected, 
        setIsConnected, 
        calendars, 
        setCalendars,
        fetchEvents
      }}
    >
      {children}
    </GoogleCalendarContext.Provider>
  );
}

export function useGoogleCalendar() {
  const context = useContext(GoogleCalendarContext);
  if (context === undefined) {
    throw new Error('useGoogleCalendar must be used within a GoogleCalendarProvider');
  }
  return context;
} 