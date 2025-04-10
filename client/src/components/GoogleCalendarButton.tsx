import { useState, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { CalendarClock, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGoogleCalendar } from '@/contexts/GoogleCalendarContext';

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
  const { setIsConnected, setCalendars, isConnected, calendars } = useGoogleCalendar();
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

  const handleAuthClick = async () => {
    if (!isInitialized) {
      toast({
        title: "Please wait",
        description: "Calendar API is still initializing...",
      });
      return;
    }

    setIsLoading(true);
    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: async (response: any) => {
          if (response.error) {
            console.error('OAuth error:', response);
            toast({
              title: "Authentication Error",
              description: response.error.message || "Could not authenticate with Google Calendar",
              variant: "destructive",
            });
            return;
          }
          
          try {
            console.log('Fetching calendar list...');
            const calendarList = await window.gapi.client.calendar.calendarList.list();
            
            const calendars = calendarList.result.items.map((cal: any) => ({
              id: cal.id,
              summary: cal.summary,
              description: cal.description,
              timeZone: cal.timeZone,
            }));
            
            setCalendars(calendars);
            setIsConnected(true);
            
            toast({
              title: "Calendars Connected",
              description: `Successfully connected ${calendars.length} calendars`,
            });
          } catch (error: any) {
            console.error('Error fetching calendars:', error);
            toast({
              title: "Connection Error",
              description: error.result?.error?.message || "Could not fetch calendars",
              variant: "destructive",
            });
          }
        },
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

  return (
    <div className="w-full">
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
      {isConnected && (
        <div className="flex items-center gap-1 px-3 py-1 text-xs text-green-600">
          <Check className="h-3 w-3" />
          <span>{calendars.length} Calendar{calendars.length !== 1 ? 's' : ''} Connected</span>
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