import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { CalendarClock, Check, MoreVertical, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGoogleCalendar } from '@/contexts/GoogleCalendarContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useLocation } from 'wouter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function GoogleCalendarButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { isConnected, calendars } = useGoogleCalendar();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

  const handleAuthClick = async () => {
    console.log('Auth click handler started');
    console.log('Session:', session);
    console.log('Client ID:', CLIENT_ID);

    if (!session?.user?.id) {
      toast({ title: "Not Logged In", description: "Please log in to connect your calendar.", variant: "destructive" });
      setLocation('/login');
      return;
    }

    if (!CLIENT_ID) {
      console.error('Missing Google Client ID');
      toast({
        title: "Configuration Error",
        description: "Google Calendar integration is not properly configured.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Generate state parameter with user ID
      const state = JSON.stringify({
        user_id: session.user.id,
        nonce: Math.random().toString(36).substring(2)
      });

      console.log('Generated state:', state);

      // Store state in localStorage for verification
      localStorage.setItem('googleOAuthState', state);

      // Construct OAuth URL with all necessary parameters
      const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      oauthUrl.searchParams.append('client_id', CLIENT_ID);
      oauthUrl.searchParams.append('redirect_uri', 'https://groov-tasks.vercel.app/auth/google/callback');
      oauthUrl.searchParams.append('response_type', 'code');
      oauthUrl.searchParams.append('scope', SCOPES);
      oauthUrl.searchParams.append('access_type', 'offline');
      oauthUrl.searchParams.append('prompt', 'consent');
      oauthUrl.searchParams.append('state', state);

      const finalUrl = oauthUrl.toString();
      console.log('[GoogleCalendarButton] Attempting to redirect to:', finalUrl);

      // Redirect to Google OAuth
      window.location.href = finalUrl;
    } catch (error: any) {
      console.error('Auth error:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Could not connect to Google Calendar",
        variant: "destructive",
      });
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

      // Invalidate the React Query cache to refetch calendar data
      await queryClient.invalidateQueries({ queryKey: ['connectedCalendars'] });

      toast({
        title: "Calendar Disconnected",
        description: "Successfully disconnected Google Calendar.",
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
          disabled={isLoading}
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
    </div>
  );
} 