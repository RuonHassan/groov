import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';

export default function GoogleCalendarCallback() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      
      // Verify state matches what we stored
      const storedState = localStorage.getItem('googleOAuthState');
      localStorage.removeItem('googleOAuthState'); // Clean up

      if (!storedState || storedState !== state) {
        toast({
          title: "Security Error",
          description: "OAuth state mismatch. Please try again.",
          variant: "destructive",
        });
        setLocation('/app');
        return;
      }

      // Get session directly from Supabase
      const session = supabase.auth.session();

      if (!session?.access_token) {
        toast({
          title: "Authentication Error",
          description: "Please log in to connect your calendar.",
          variant: "destructive",
        });
        setLocation('/login');
        return;
      }

      try {
        // Call our Edge Function
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-callback`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ code, state }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to connect calendar');
        }

        // Invalidate calendar queries to refresh the data
        await queryClient.invalidateQueries(['connectedCalendars']);

        toast({
          title: "Success",
          description: "Calendar connected successfully!",
        });
      } catch (error: any) {
        console.error('Callback error:', error);
        toast({
          title: "Connection Failed",
          description: error.message || "Could not complete calendar connection",
          variant: "destructive",
        });
      }

      // Redirect back to dashboard
      setLocation('/app');
    };

    handleCallback();
  }, []); // Remove session dependency since we're getting it directly

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Connecting your calendar...</h2>
        <p className="text-sm text-gray-500">Please wait while we complete the setup.</p>
      </div>
    </div>
  );
} 