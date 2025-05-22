import React, { createContext, useContext, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabaseClient';
import type { ConnectedCalendar } from '@shared/schema';

// Define supported calendar providers
export type CalendarProvider = 'google' | 'microsoft';

interface CalendarContextType {
  isConnected: boolean;
  calendars: ConnectedCalendar[];
  isLoading: boolean;
  error: Error | null;
  fetchEvents: (calendarId: string, timeMin: Date, timeMax: Date) => Promise<any[]>;
  refreshToken: (calendar: ConnectedCalendar) => Promise<ConnectedCalendar | null>;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

// Function to fetch connected calendars from Supabase
const fetchConnectedCalendars = async (userId: string | undefined): Promise<ConnectedCalendar[]> => {
  if (!userId) {
    return [];
  }

  const { data, error } = await supabase
    .from('connected_calendars')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  return data || [];
};

// Function to refresh the access token
const refreshAccessToken = async (calendar: ConnectedCalendar): Promise<ConnectedCalendar | null> => {
  if (!calendar.refresh_token) {
    console.error('No refresh token available for calendar:', calendar.calendar_id);
    return null;
  }

  try {
    console.log(`Attempting to refresh token for ${calendar.provider} calendar`);
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-token-refresh`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
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
      const errorText = await response.text();
      console.error('Token refresh failed with status:', response.status, errorText);
      throw new Error(`Failed to refresh token: ${response.status} ${errorText}`);
    }

    const updatedCalendar = await response.json();
    console.log('Token refresh successful');
    return updatedCalendar;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
};

// Provider-specific API initializers and event fetchers
import { initializeGoogleApi, fetchGoogleEvents } from '@/utils/googleCalendarUtils';
import { initializeMicrosoftApi, fetchMicrosoftEvents } from '@/utils/outlookCalendarUtils';

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [apiError, setApiError] = useState<Error | null>(null);
  const queryClient = useQueryClient();

  // Use React Query to fetch connected calendars from Supabase
  const { 
    data: calendars = [], 
    isLoading, 
    error: calendarError
  } = useQuery<ConnectedCalendar[], Error>({
    queryKey: ['connectedCalendars', userId],
    queryFn: () => fetchConnectedCalendars(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    refetchOnWindowFocus: true,
  });

  // Determine connection status based on fetched data
  const isConnected = calendars.length > 0 && calendars.some(cal => cal.is_enabled);

  const fetchEvents = async (calendarId: string, timeMin: Date, timeMax: Date) => {
    try {
      // Find the calendar and its token
      const calendar = calendars.find(cal => cal.calendar_id === calendarId);
      if (!calendar) {
        console.warn('Calendar not found:', {
          searchId: calendarId,
          availableIds: calendars.map(c => c.calendar_id)
        });
        return [];
      }

      // Check if token is expired
      const now = new Date();
      const tokenExpiry = calendar.token_expires_at ? new Date(calendar.token_expires_at) : null;
      let currentCalendar = calendar;

      // If token is expired or will expire in the next 5 minutes, refresh it
      if (!tokenExpiry || tokenExpiry.getTime() - now.getTime() < 5 * 60 * 1000) {
        console.log('Token expired or expiring soon, refreshing...');
        const refreshedCalendar = await refreshAccessToken(calendar);
        if (!refreshedCalendar) {
          throw new Error('Failed to refresh access token');
        }
        currentCalendar = refreshedCalendar;
        
        // Update the calendars in React Query cache
        queryClient.setQueryData(['connectedCalendars', userId], (old: ConnectedCalendar[] | undefined) => {
          if (!old) return [refreshedCalendar];
          return old.map(cal => cal.id === refreshedCalendar.id ? refreshedCalendar : cal);
        });
      }

      // Call provider-specific event fetcher
      switch (currentCalendar.provider) {
        case 'google':
          await initializeGoogleApi();
          return fetchGoogleEvents(currentCalendar, timeMin, timeMax);
        case 'microsoft':
          await initializeMicrosoftApi();
          return fetchMicrosoftEvents(currentCalendar, timeMin, timeMax);
        default:
          throw new Error(`Unsupported calendar provider: ${currentCalendar.provider}`);
      }
    } catch (error: any) {
      console.error('Error fetching calendar events:', {
        error,
        errorMessage: error.message,
        errorResult: error.result,
        calendarId
      });
      
      if (error.result?.error?.code === 401) {
        // Token refresh failed or refresh token is invalid
        setApiError(new Error('Calendar access expired. Please reconnect your calendar.'));
      } else {
        setApiError(error);
      }
      return [];
    }
  };

  return (
    <CalendarContext.Provider 
      value={{ 
        isConnected, 
        calendars, 
        isLoading,
        error: apiError || calendarError,
        fetchEvents,
        refreshToken: refreshAccessToken
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

