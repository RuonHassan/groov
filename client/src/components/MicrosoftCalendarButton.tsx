import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCalendar } from '@/contexts/CalendarContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useLocation } from 'wouter';
import { generateMicrosoftAuthUrl } from '@/utils/outlookCalendarUtils';

export default function MicrosoftCalendarButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { calendars } = useCalendar();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // Check if Microsoft calendar is connected
  const microsoftCalendar = calendars.find(cal => cal.provider === 'microsoft');
  const isConnected = !!microsoftCalendar;

  const handleAuthClick = async () => {
    if (!session?.user?.id) {
      toast({ title: "Not Logged In", description: "Please log in to connect your calendar.", variant: "destructive" });
      setLocation('/login');
      return;
    }

    const CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
    if (!CLIENT_ID) {
      console.error('Missing Microsoft Client ID');
      toast({
        title: "Configuration Error",
        description: "Microsoft Calendar integration is not properly configured.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Generate Microsoft OAuth URL and redirect
      const authUrl = generateMicrosoftAuthUrl(session.user.id);
      window.location.href = authUrl;
    } catch (error: any) {
      console.error('Auth error:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Could not connect to Microsoft Calendar",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleDeleteCalendar = async () => {
    if (!session?.user?.id || !microsoftCalendar) return;

    try {
      setIsLoading(true);

      const { error: deleteError } = await supabase
        .from('connected_calendars')
        .delete()
        .eq('id', microsoftCalendar.id);

      if (deleteError) {
        throw deleteError;
      }

      await queryClient.invalidateQueries({ queryKey: ['connectedCalendars'] });

      toast({
        title: "Calendar Disconnected",
        description: "Successfully disconnected Microsoft Calendar.",
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
      Add Outlook
    </Button>
  );
}

