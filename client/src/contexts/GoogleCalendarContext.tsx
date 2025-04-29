import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import type { ConnectedCalendar } from '@shared/schema';
import { initializeGoogleApi } from '@/lib/googleApi';

interface GoogleCalendarContextType {
  isConnected: boolean;
  calendars: ConnectedCalendar[];
  isLoading: boolean;
  error: Error | null;
  fetchEvents: (calendarId: string, timeMin: Date, timeMax: Date) => Promise<any[]>;
}

const GoogleCalendarContext = createContext<GoogleCalendarContextType | undefined>(undefined);

// Function to refresh the access token
const refreshAccessToken = async (calendar: ConnectedCalendar): Promise<ConnectedCalendar | null> => {
  if (!calendar.refresh_token) {
    console.error('No refresh token available for calendar:', calendar.calendar_id);
    return null;
  }

  try {
    console.log('Attempting to refresh token using Edge Function');
    // Call our Edge Function instead of Google directly
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-refresh`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          calendar_id: calendar.id,
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

// Function to fetch connected calendars from Supabase
const fetchConnectedCalendars = async (userId: string | undefined): Promise<ConnectedCalendar[]> => {
  if (!userId) {
    return [];
  }

  const { data, error } = await supabase
    .from('connected_calendars')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'google');

  if (error) {
    throw error;
  }

  return data || [];
};

// Track initialization state
let isInitializing = false;
let isInitialized = false;

export function GoogleCalendarProvider({ children }: { children: React.ReactNode }) {
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

  const fetchEvents = useCallback(async (calendarId: string, timeMin: Date, timeMax: Date) => {
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

      // Initialize API if needed
      await initializeGoogleApi();

      // Set the token for this request
      window.gapi.client.setToken({ 
        access_token: currentCalendar.access_token
      });

      const response = await window.gapi.client.calendar.events.list({
        calendarId: currentCalendar.calendar_id,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        showDeleted: false,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 100
      });

      return response.result.items || [];
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
  }, [calendars, userId, queryClient]);

  return (
    <GoogleCalendarContext.Provider 
      value={{ 
        isConnected, 
        calendars, 
        isLoading,
        error: apiError || calendarError,
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