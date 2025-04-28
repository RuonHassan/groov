import { useEffect } from 'react';
import { useLocation, useNavigate } from 'wouter';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';

export default function GoogleCalendarCallback() {
  const [, navigate] = useNavigate();
  const [location] = useLocation();
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
        navigate('/dashboard');
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
              'Authorization': `Bearer ${supabase.auth.session()?.access_token}`,
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
      navigate('/dashboard');
    };

    handleCallback();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Connecting your calendar...</h2>
        <p className="text-sm text-gray-500">Please wait while we complete the setup.</p>
      </div>
    </div>
  );
} 