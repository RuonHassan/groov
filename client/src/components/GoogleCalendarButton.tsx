import { useState, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { CalendarClock, Check, MoreVertical, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGoogleCalendar } from '@/contexts/GoogleCalendarContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

export default function GoogleCalendarButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();
  const { isConnected, calendars } = useGoogleCalendar();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
  const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
  const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

  const initializeGapiClient = async () => {
    try {
      console.log('Initializing GAPI client...');
      
      if (!API_KEY || !CLIENT_ID) {
        throw new Error('API Key or Client ID is not set in environment variables');
      }

      // Initialize the GAPI client
      await window.gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
      });

      console.log('GAPI client initialized successfully');
      setIsInitialized(true);
    } catch (error: any) {
      let errorMessage = "Could not initialize Google Calendar API. ";
      
      try {
        const parsedError = typeof error.error === 'string' ? JSON.parse(error.error) : error;
        console.error('Initialization error:', parsedError);
        errorMessage += parsedError.error?.message || error.message || 'Unknown error occurred';
      } catch (e) {
        errorMessage += error.message || 'Unknown error occurred';
      }
      
      toast({
        title: "Initialization Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw error;
    }
  };

  useEffect(() => {
    const initializeGapi = () => {
      if (!window.gapi) {
        console.error('Google API client not found');
        toast({
          title: "Loading Error",
          description: "Google API client not found. Please check if the script is loaded correctly.",
          variant: "destructive",
        });
        return;
      }

      console.log('Loading GAPI client...');
      window.gapi.load('client', {
        callback: initializeGapiClient,
        onerror: (err: any) => {
          console.error('Error loading GAPI client:', err);
          toast({
            title: "Loading Error",
            description: "Could not load Google Calendar API client.",
            variant: "destructive",
          });
        }
      });
    };

    // Small delay to ensure scripts are loaded
    setTimeout(initializeGapi, 100);
  }, []);

  const handleTokenResponse = async (response: any) => {
    if (response.error) {
      console.error('OAuth error:', response);
      toast({
        title: "Authentication Error",
        description: response.error || "Could not authenticate with Google Calendar",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      console.log('Google Auth successful, fetching primary calendar info...');
      const accessToken = response.access_token;
      const expiresIn = response.expires_in;
      const refreshToken = response.refresh_token || null;

      // Set token temporarily to fetch calendar info
      window.gapi.client.setToken({ access_token: accessToken });

      const calendarList = await window.gapi.client.calendar.calendarList.list({ maxResults: 10 });
      const primaryCalendar = calendarList.result.items.find((cal: any) => cal.primary);
      
      if (!primaryCalendar) {
          toast({ title: "Error", description: "Could not find primary Google Calendar.", variant: "destructive" });
          setIsLoading(false);
          return;
      }

      console.log('Saving calendar connection to Supabase...');

      // Calculate expiry timestamp
      const now = Date.now();
      const expiresAt = new Date(now + expiresIn * 1000).toISOString();

      // Insert/Update the calendar connection in Supabase
      const { data: savedConnection, error: supabaseError } = await supabase
        .from('connected_calendars')
        .upsert({
          user_id: session?.user?.id, // Supabase user ID
          provider: 'google',
          calendar_id: primaryCalendar.id,
          calendar_name: primaryCalendar.summary,
          access_token: accessToken,
          refresh_token: refreshToken,
          token_expires_at: expiresAt,
          is_primary: true,
          is_enabled: true,
        }, {
          onConflict: 'user_id,provider'
        });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      // Invalidate the React Query cache to refetch calendar data
      await queryClient.invalidateQueries({ queryKey: ['connectedCalendars'] });

      toast({
        title: "Calendar Connected",
        description: `Successfully connected ${primaryCalendar.summary}`,
      });
      
    } catch (error: any) {
      console.error('Error processing token or saving to Supabase:', error);
      toast({
        title: "Connection Error",
        description: error.message || "Could not save Google Calendar connection",
        variant: "destructive",
      });
    } finally {
      // Clear the temporary token
      window.gapi.client.setToken(null);
      setIsLoading(false);
    }
  };

  const handleAuthClick = async () => {
    if (!isInitialized) {
      toast({ title: "Please wait", description: "Calendar API is still initializing..." });
      return;
    }
    if (!session) {
      toast({ title: "Not Logged In", description: "Please log in to connect your calendar.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: handleTokenResponse,
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (error: any) {
      console.error('Auth error:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Could not connect to Google Calendar",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCalendar = async () => {
    if (!session?.user?.id || calendars.length === 0) return;

    try {
      setIsLoading(true);
      const calendar = calendars[0]; // Get the first calendar since we only support one for now

      // Delete the calendar connection from Supabase
      const { error: deleteError } = await supabase
        .from('connected_calendars')
        .delete()
        .eq('id', calendar.id);

      if (deleteError) {
        throw deleteError;
      }

      // Clear Google API token
      if (window.gapi?.client?.getToken()) {
        window.gapi.client.setToken(null);
      }

      // Invalidate the React Query cache to refetch calendar data
      await queryClient.invalidateQueries({ queryKey: ['connectedCalendars'] });

      toast({
        title: "Calendar Disconnected",
        description: "Successfully disconnected Google Calendar",
      });
    } catch (error: any) {
      console.error('Error deleting calendar connection:', error);
      toast({
        title: "Error",
        description: "Could not disconnect calendar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {!isConnected ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAuthClick}
          disabled={isLoading || !isInitialized}
          className="flex items-center gap-2 w-full justify-start"
        >
          <CalendarClock className="h-4 w-4" />
          <span>Add Calendar</span>
        </Button>
      ) : (
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1 px-3 py-1 text-xs text-green-600">
            <Check className="h-3 w-3" />
            <span>Calendar Connected</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 cursor-pointer"
                onClick={handleDeleteCalendar}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Disconnect Calendar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      {isLoading && (
        <div className="px-3 py-1 text-xs text-gray-500">
          Connecting...
        </div>
      )}
      {!isInitialized && !isLoading && (
        <div className="px-3 py-1 text-xs text-gray-500">
          Initializing...
        </div>
      )}
    </div>
  );
} 