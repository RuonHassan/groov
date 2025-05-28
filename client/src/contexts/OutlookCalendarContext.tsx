import React, { createContext, useContext, useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabaseClient';
import type { ConnectedCalendar } from '@shared/schema';

interface OutlookCalendarContextType {
  isConnected: boolean;
  calendars: ConnectedCalendar[];
  isLoading: boolean;
  error: Error | null;
  fetchEvents: (calendarId: string, timeMin: Date, timeMax: Date) => Promise<any[]>;
}

const OutlookCalendarContext = createContext<OutlookCalendarContextType | undefined>(undefined);

// Refresh access token via Edge Function (placeholder)
const refreshAccessToken = async (calendar: ConnectedCalendar): Promise<ConnectedCalendar | null> => {
  if (!calendar.refresh_token) return null;
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/outlook-calendar-refresh`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          calendar_id: calendar.id,
          refresh_token: calendar.refresh_token
        }),
      }
    );
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
};

const fetchConnectedCalendars = async (userId: string | undefined): Promise<ConnectedCalendar[]> => {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('connected_calendars')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'outlook');
  if (error) throw error;
  return data || [];
};

export function OutlookCalendarProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();
  const [apiError, setApiError] = useState<Error | null>(null);

  const { data: calendars = [], isLoading, error: calendarError } = useQuery<ConnectedCalendar[], Error>({
    queryKey: ['connectedCalendars', 'outlook', userId],
    queryFn: () => fetchConnectedCalendars(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const isConnected = calendars.length > 0 && calendars.some(cal => cal.is_enabled);

  const fetchEvents = useCallback(async (calendarId: string, timeMin: Date, timeMax: Date) => {
    try {
      const calendar = calendars.find(cal => cal.calendar_id === calendarId);
      if (!calendar) return [];

      const now = new Date();
      const tokenExpiry = calendar.token_expires_at ? new Date(calendar.token_expires_at) : null;
      let currentCalendar = calendar;

      if (!tokenExpiry || tokenExpiry.getTime() - now.getTime() < 5 * 60 * 1000) {
        const refreshed = await refreshAccessToken(calendar);
        if (refreshed) {
          currentCalendar = refreshed;
          queryClient.setQueryData(['connectedCalendars', 'outlook', userId], (old: ConnectedCalendar[] | undefined) => {
            if (!old) return [refreshed];
            return old.map(c => c.id === refreshed.id ? refreshed : c);
          });
        }
      }

      const url = `https://graph.microsoft.com/v1.0/me/calendars/${currentCalendar.calendar_id}/calendarView?startDateTime=${timeMin.toISOString()}&endDateTime=${timeMax.toISOString()}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${currentCalendar.access_token}`
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Failed to fetch events');
      return data.value || [];
    } catch (error: any) {
      setApiError(error);
      return [];
    }
  }, [calendars, userId, queryClient]);

  return (
    <OutlookCalendarContext.Provider value={{ isConnected, calendars, isLoading, error: apiError || calendarError, fetchEvents }}>
      {children}
    </OutlookCalendarContext.Provider>
  );
}

export function useOutlookCalendar() {
  const context = useContext(OutlookCalendarContext);
  if (!context) {
    throw new Error('useOutlookCalendar must be used within a OutlookCalendarProvider');
  }
  return context;
}
