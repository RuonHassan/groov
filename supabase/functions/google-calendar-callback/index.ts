import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Get environment variables (without VITE_ prefix)
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const REDIRECT_URI = Deno.env.get('REDIRECT_URI') || 'https://groov-tasks.vercel.app/auth/google/callback';
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { code, state } = await req.json();
    const { user_id } = JSON.parse(state);

    if (!code || !user_id) {
      throw new Error('Missing required parameters');
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
        scope: SCOPES
      })
    });

    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error('Token exchange error:', tokens);
      throw new Error(`Token exchange failed: ${tokens.error}`);
    }

    // Get primary calendar info
    const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`
      }
    });

    const calendars = await calendarResponse.json();
    if (!calendarResponse.ok) {
      console.error('Calendar list error:', calendars);
      throw new Error('Failed to fetch calendar list');
    }

    const primaryCalendar = calendars.items.find((cal) => cal.primary);
    if (!primaryCalendar) {
      throw new Error('Could not find primary calendar');
    }

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Store in database
    const { error: dbError } = await supabase
      .from('connected_calendars')
      .upsert({
        user_id,
        provider: 'google',
        calendar_id: primaryCalendar.id,
        calendar_name: primaryCalendar.summary,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        is_primary: true,
        is_enabled: true
      }, {
        onConflict: 'user_id,provider'
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Edge function error:', error);
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