import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Get environment variables
const MICROSOFT_CLIENT_ID = Deno.env.get('MICROSOFT_CLIENT_ID');
const MICROSOFT_CLIENT_SECRET = Deno.env.get('MICROSOFT_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const REDIRECT_URI = Deno.env.get('MICROSOFT_REDIRECT_URI') || 'https://groov-tasks.vercel.app/auth/microsoft/callback';
const SCOPES = 'Calendars.Read offline_access';

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

    // --- START DEBUG LOGGING ---
    console.log(`[Edge Function] Received code: ${code ? 'present' : 'missing'}`);
    console.log(`[Edge Function] Parsed user_id: ${user_id}`);
    console.log(`[Edge Function] Using MICROSOFT_CLIENT_ID: ${MICROSOFT_CLIENT_ID?.substring(0, 10)}...`); // Log first 10 chars
    console.log(`[Edge Function] MICROSOFT_CLIENT_SECRET length: ${MICROSOFT_CLIENT_SECRET?.length}`); // Log length only
    console.log(`[Edge Function] Using REDIRECT_URI for token exchange: ${REDIRECT_URI}`);
    // --- END DEBUG LOGGING ---

    // Exchange code for tokens
    const tokenPayload = new URLSearchParams({
      code,
      client_id: MICROSOFT_CLIENT_ID,
      client_secret: MICROSOFT_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
      scope: SCOPES
    });

    console.log('[Edge Function] Sending token exchange request to Microsoft...');

    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenPayload
    });

    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error('[Edge Function] Token exchange error response from Microsoft:', tokens);
      throw new Error(`Token exchange failed: ${tokens.error}`);
    }

    console.log('[Edge Function] Token exchange successful.');

    // Get primary calendar info
    const calendarResponse = await fetch('https://graph.microsoft.com/v1.0/me/calendars', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`
      }
    });

    const calendars = await calendarResponse.json();
    if (!calendarResponse.ok) {
      console.error('[Edge Function] Calendar list error:', calendars);
      throw new Error('Failed to fetch calendar list');
    }

    // Find primary calendar (usually the first one)
    const primaryCalendar = calendars.value[0];
    if (!primaryCalendar) {
      throw new Error('Could not find any calendars');
    }

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Store in database
    console.log('[Edge Function] Upserting calendar details to database...');

    const { error: dbError } = await supabase
      .from('connected_calendars')
      .upsert({
        user_id,
        provider: 'microsoft',
        calendar_id: primaryCalendar.id,
        calendar_name: primaryCalendar.name,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        is_primary: true,
        is_enabled: true
      }, {
        onConflict: 'user_id,provider'
      });

    if (dbError) {
      console.error('[Edge Function] Database error:', dbError);
      throw dbError;
    }

    console.log('[Edge Function] Database upsert successful.');

    return new Response(JSON.stringify({ success: true }), {
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

