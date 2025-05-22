import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Get environment variables
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const MICROSOFT_CLIENT_ID = Deno.env.get('MICROSOFT_CLIENT_ID');
const MICROSOFT_CLIENT_SECRET = Deno.env.get('MICROSOFT_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { calendar_id, provider, refresh_token } = await req.json();

    if (!calendar_id || !provider || !refresh_token) {
      throw new Error('Missing required parameters');
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Get the calendar from the database to verify it exists
    const { data: calendar, error: fetchError } = await supabase
      .from('connected_calendars')
      .select('*')
      .eq('id', calendar_id)
      .single();

    if (fetchError || !calendar) {
      throw new Error(`Calendar not found: ${fetchError?.message || 'Unknown error'}`);
    }

    // Refresh token based on provider
    let tokenResponse;
    let tokens;

    if (provider === 'google') {
      // Google token refresh
      const tokenPayload = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token,
        grant_type: 'refresh_token'
      });

      tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: tokenPayload
      });
    } else if (provider === 'microsoft') {
      // Microsoft token refresh
      const tokenPayload = new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID,
        client_secret: MICROSOFT_CLIENT_SECRET,
        refresh_token,
        grant_type: 'refresh_token',
        scope: 'Calendars.Read offline_access'
      });

      tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: tokenPayload
      });
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    tokens = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error(`[Edge Function] Token refresh error for ${provider}:`, tokens);
      throw new Error(`Token refresh failed: ${tokens.error}`);
    }

    // Calculate new token expiry
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Update the calendar in the database
    const updateData = {
      access_token: tokens.access_token,
      token_expires_at: expiresAt
    };

    // If a new refresh token was provided, update it too
    if (tokens.refresh_token) {
      updateData.refresh_token = tokens.refresh_token;
    }

    const { data: updatedCalendar, error: updateError } = await supabase
      .from('connected_calendars')
      .update(updateData)
      .eq('id', calendar_id)
      .select('*')
      .single();

    if (updateError) {
      console.error('[Edge Function] Database update error:', updateError);
      throw updateError;
    }

    return new Response(JSON.stringify(updatedCalendar), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('[Edge Function] Error caught:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
});

