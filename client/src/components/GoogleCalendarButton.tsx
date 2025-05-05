import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGoogleCalendar } from '@/contexts/GoogleCalendarContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useLocation } from 'wouter';

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
      const state = JSON.stringify({
        user_id: session.user.id,
        nonce: Math.random().toString(36).substring(2)
      });

      localStorage.setItem('googleOAuthState', state);

      const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      oauthUrl.searchParams.append('client_id', CLIENT_ID);
      oauthUrl.searchParams.append('redirect_uri', 'https://groov-tasks.vercel.app/auth/google/callback');
      oauthUrl.searchParams.append('response_type', 'code');
      oauthUrl.searchParams.append('scope', SCOPES);
      oauthUrl.searchParams.append('access_type', 'offline');
      oauthUrl.searchParams.append('prompt', 'consent');
      oauthUrl.searchParams.append('state', state);

      window.location.href = oauthUrl.toString();
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
      const calendar = calendars[0];

      const { error: deleteError } = await supabase
        .from('connected_calendars')
        .delete()
        .eq('id', calendar.id);

      if (deleteError) {
        throw deleteError;
      }

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

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (isConnected) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleDeleteCalendar}
        className="text-red-600 hover:text-red-700"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleAuthClick}
    >
      Add Calendar
    </Button>
  );
} 