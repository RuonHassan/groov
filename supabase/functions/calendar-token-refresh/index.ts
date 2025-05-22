import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

interface TokenRefreshRequest {
  calendar_id: string;
  provider: 'google' | 'microsoft';
  refresh_token: string;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

serve(async (req) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    // Get the request data
    const { calendar_id, provider, refresh_token }: TokenRefreshRequest = await req.json();
    
    if (!calendar_id || !provider || !refresh_token) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers }
      );
    }

    // Get the JWT token from the request headers
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers }
      );
    }

    // Create a Supabase client with the user's JWT
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Verify the user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers }
      );
    }

    // Verify the calendar belongs to the user
    const { data: calendar, error: calendarError } = await supabase
      .from('connected_calendars')
      .select('*')
      .eq('id', calendar_id)
      .eq('user_id', user.id)
      .single();

    if (calendarError || !calendar) {
      return new Response(
        JSON.stringify({ error: 'Calendar not found or access denied' }),
        { status: 404, headers }
      );
    }

    // Refresh the token based on the provider
    let tokenData: TokenResponse;
    
    if (provider === 'google') {
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

      if (!clientId || !clientSecret) {
        return new Response(
          JSON.stringify({ error: 'Google OAuth configuration is incomplete' }),
          { status: 500, headers }
        );
      }

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error('Google token refresh error:', errorData);
        return new Response(
          JSON.stringify({ error: 'Failed to refresh Google token' }),
          { status: 500, headers }
        );
      }

      tokenData = await tokenResponse.json();
    } else if (provider === 'microsoft') {
      const clientId = Deno.env.get('MICROSOFT_CLIENT_ID');
      const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET');

      if (!clientId || !clientSecret) {
        return new Response(
          JSON.stringify({ error: 'Microsoft OAuth configuration is incomplete' }),
          { status: 500, headers }
        );
      }

      const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token,
          grant_type: 'refresh_token',
          scope: 'Calendars.Read offline_access',
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error('Microsoft token refresh error:', errorData);
        return new Response(
          JSON.stringify({ error: 'Failed to refresh Microsoft token' }),
          { status: 500, headers }
        );
      }

      tokenData = await tokenResponse.json();
    } else {
      return new Response(
        JSON.stringify({ error: 'Unsupported provider' }),
        { status: 400, headers }
      );
    }

    // Calculate token expiration time
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

    // Update the database with the new token
    const updateData: Record<string, any> = {
      access_token: tokenData.access_token,
      token_expires_at: expiresAt.toISOString(),
    };

    // If a new refresh token was provided, update it as well
    if (tokenData.refresh_token) {
      updateData.refresh_token = tokenData.refresh_token;
    }

    const { error: updateError } = await supabase
      .from('connected_calendars')
      .update(updateData)
      .eq('id', calendar_id);

    if (updateError) {
      console.error('Database update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update token information' }),
        { status: 500, headers }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers }
    );
  }
});

