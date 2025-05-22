import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Define types
export type CalendarProvider = 'google' | 'microsoft';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  location?: string;
  colorId?: string;
  status?: string;
  htmlLink?: string;
  provider: CalendarProvider;
}

export interface ConnectedCalendar {
  id: string;
  user_id: string;
  provider: CalendarProvider;
  calendar_id: string;
  calendar_name: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  is_primary: boolean;
  is_enabled: boolean;
}

interface CalendarContextType {
  isConnected: boolean;
  calendars: ConnectedCalendar[];
  fetchEvents: (startDate: Date, endDate: Date) => Promise<CalendarEvent[]>;
  isLoading: boolean;
  error: Error | null;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export function CalendarProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<Error | null>(null);

  // Fetch connected calendars from Supabase
  const { data: calendars = [], isLoading } = useQuery({
    queryKey: ['connectedCalendars', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];

      try {
        const { data, error } = await supabase
          .from('connected_calendars')
          .select('*')
          .eq('user_id', session.user.id);

        if (error) throw error;
        return data as ConnectedCalendar[];
      } catch (error: any) {
        console.error('Error fetching calendars:', error);
        setError(error);
        return [];
      }
    },
    enabled: !!session?.user?.id,
  });

  // Check if any calendar is connected
  const isConnected = calendars.length > 0;

  // Fetch events from all connected calendars
  const fetchEvents = async (startDate: Date, endDate: Date): Promise<CalendarEvent[]> => {
    if (!session?.user?.id || !isConnected) return [];

    try {
      // Prepare the timeMin and timeMax parameters
      const timeMin = startDate.toISOString();
      const timeMax = endDate.toISOString();

      // Collect events from all calendars
      const allEvents: CalendarEvent[] = [];

      // Process each connected calendar
      for (const calendar of calendars) {
        if (!calendar.is_enabled) continue;

        try {
          let events: CalendarEvent[] = [];

          // Fetch events based on provider
          if (calendar.provider === 'google') {
            // Fetch Google Calendar events
            const response = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
              {
                headers: {
                  Authorization: `Bearer ${calendar.access_token}`,
                },
              }
            );

            if (!response.ok) {
              // If token expired, try to refresh it
              if (response.status === 401) {
                await refreshToken(calendar);
                // Retry with new token
                const retryResponse = await fetch(
                  `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
                  {
                    headers: {
                      Authorization: `Bearer ${calendar.access_token}`,
                    },
                  }
                );
                
                if (!retryResponse.ok) {
                  throw new Error(`Failed to fetch Google events after token refresh: ${retryResponse.statusText}`);
                }
                
                const data = await retryResponse.json();
                events = (data.items || []).map((event: any) => ({
                  ...event,
                  provider: 'google',
                }));
              } else {
                throw new Error(`Failed to fetch Google events: ${response.statusText}`);
              }
            } else {
              const data = await response.json();
              events = (data.items || []).map((event: any) => ({
                ...event,
                provider: 'google',
              }));
            }
          } else if (calendar.provider === 'microsoft') {
            // Fetch Microsoft Calendar events
            const response = await fetch(
              `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${timeMin}&endDateTime=${timeMax}`,
              {
                headers: {
                  Authorization: `Bearer ${calendar.access_token}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (!response.ok) {
              // If token expired, try to refresh it
              if (response.status === 401) {
                await refreshToken(calendar);
                // Retry with new token
                const retryResponse = await fetch(
                  `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${timeMin}&endDateTime=${timeMax}`,
                  {
                    headers: {
                      Authorization: `Bearer ${calendar.access_token}`,
                      'Content-Type': 'application/json',
                    },
                  }
                );
                
                if (!retryResponse.ok) {
                  throw new Error(`Failed to fetch Microsoft events after token refresh: ${retryResponse.statusText}`);
                }
                
                const data = await retryResponse.json();
                events = (data.value || []).map((event: any) => ({
                  id: event.id,
                  summary: event.subject,
                  description: event.bodyPreview,
                  start: {
                    dateTime: event.start.dateTime,
                    timeZone: event.start.timeZone,
                  },
                  end: {
                    dateTime: event.end.dateTime,
                    timeZone: event.end.timeZone,
                  },
                  location: event.location?.displayName,
                  status: event.showAs,
                  provider: 'microsoft',
                }));
              } else {
                throw new Error(`Failed to fetch Microsoft events: ${response.statusText}`);
              }
            } else {
              const data = await response.json();
              events = (data.value || []).map((event: any) => ({
                id: event.id,
                summary: event.subject,
                description: event.bodyPreview,
                start: {
                  dateTime: event.start.dateTime,
                  timeZone: event.start.timeZone,
                },
                end: {
                  dateTime: event.end.dateTime,
                  timeZone: event.end.timeZone,
                },
                location: event.location?.displayName,
                status: event.showAs,
                provider: 'microsoft',
              }));
            }
          }

          // Add events to the collection
          allEvents.push(...events);
        } catch (error) {
          console.error(`Error fetching events from ${calendar.provider} calendar:`, error);
        }
      }

      return allEvents;
    } catch (error: any) {
      console.error('Error fetching events:', error);
      setError(error);
      return [];
    }
  };

  // Helper function to refresh an expired token
  const refreshToken = async (calendar: ConnectedCalendar) => {
    if (!session?.user?.id) return;

    try {
      // Call our Edge Function to refresh the token
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-token-refresh`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            calendar_id: calendar.id,
            provider: calendar.provider,
            refresh_token: calendar.refresh_token
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to refresh ${calendar.provider} token`);
      }

      // Invalidate the query to refresh the data
      await queryClient.invalidateQueries({ queryKey: ['connectedCalendars'] });
    } catch (error: any) {
      console.error(`Error refreshing ${calendar.provider} token:`, error);
      throw error;
    }
  };

  return (
    <CalendarContext.Provider
      value={{
        isConnected,
        calendars,
        fetchEvents,
        isLoading,
        error,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
}

