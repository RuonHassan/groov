import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabaseClient';
import type { ConnectedCalendar } from '@shared/schema';

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
  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

  if (!calendar.refresh_token) {
    console.error('No refresh token available for calendar:', calendar.calendar_id);
    return null;
  }

  try {
    console.log('Attempting to refresh token using refresh_token');
    // Request new access token using refresh token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: calendar.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token refresh failed with status:', response.status, errorText);
      throw new Error(`Failed to refresh token: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('Token refresh successful, expires_in:', data.expires_in);
    
    // Calculate new expiry time
    const now = Date.now();
    const expiresAt = new Date(now + data.expires_in * 1000).toISOString();

    // Update the calendar in the database with new token
    const { data: updatedCalendar, error: updateError } = await supabase
      .from('connected_calendars')
      .update({
        access_token: data.access_token,
        token_expires_at: expiresAt,
      })
      .eq('id', calendar.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

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

// Initialize Google API client
const initializeGoogleApi = async () => {
  // If already initialized, return immediately
  if (isInitialized) return;
  
  // If currently initializing, wait for it to complete
  if (isInitializing) {
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return;
  }

  try {
    isInitializing = true;

    const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
    const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';

    if (!API_KEY) {
      throw new Error('API Key is not set in environment variables');
    }

    if (!window.gapi) {
      await new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = resolve;
        document.body.appendChild(script);
      });
    }

    if (!window.gapi.client) {
      await new Promise((resolve) => window.gapi.load('client', resolve));
    }

    if (!window.gapi.client.calendar) {
      await window.gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
      });
    }

    isInitialized = true;
  } finally {
    isInitializing = false;
  }
};

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