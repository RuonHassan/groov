import type { ConnectedCalendar } from '@shared/schema';

// Track initialization state
let isInitializing = false;
let isInitialized = false;

// Initialize Microsoft Graph API client
export const initializeMicrosoftApi = async () => {
  // If already initialized, return immediately
  if (isInitialized) return;
  
  // If currently initializing, wait for it to complete
  if (isInitializing) {
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return;
  }

  try {
    isInitializing = true;

    // Microsoft Graph doesn't require client-side initialization like Google's gapi
    // We'll use fetch API directly for Microsoft Graph calls
    
    isInitialized = true;
  } finally {
    isInitializing = false;
  }
};

// Fetch events from Microsoft Outlook Calendar
export const fetchMicrosoftEvents = async (
  calendar: ConnectedCalendar,
  timeMin: Date,
  timeMax: Date
): Promise<any[]> => {
  try {
    // Format dates for Microsoft Graph API
    const startDateTime = timeMin.toISOString();
    const endDateTime = timeMax.toISOString();
    
    // Microsoft Graph API endpoint for calendar events
    const endpoint = `https://graph.microsoft.com/v1.0/me/calendars/${calendar.calendar_id}/calendarView`;
    const url = new URL(endpoint);
    url.searchParams.append('startDateTime', startDateTime);
    url.searchParams.append('endDateTime', endDateTime);
    url.searchParams.append('$top', '100');
    url.searchParams.append('$orderby', 'start/dateTime');
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${calendar.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Microsoft Graph API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.value || [];
  } catch (error: any) {
    console.error('Error fetching Microsoft calendar events:', error);
    throw error;
  }
};

// Generate Microsoft OAuth URL
export const generateMicrosoftAuthUrl = (userId: string): string => {
  const CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
  const REDIRECT_URI = import.meta.env.VITE_MICROSOFT_REDIRECT_URI || 'https://groov-tasks.vercel.app/auth/microsoft/callback';
  const SCOPES = 'Calendars.Read offline_access';

  if (!CLIENT_ID) {
    throw new Error('Missing Microsoft Client ID');
  }

  const state = JSON.stringify({
    user_id: userId,
    nonce: Math.random().toString(36).substring(2)
  });

  // Store state for verification during callback
  localStorage.setItem('microsoftOAuthState', state);

  const oauthUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
  oauthUrl.searchParams.append('client_id', CLIENT_ID);
  oauthUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  oauthUrl.searchParams.append('response_type', 'code');
  oauthUrl.searchParams.append('scope', SCOPES);
  oauthUrl.searchParams.append('response_mode', 'query');
  oauthUrl.searchParams.append('state', state);

  return oauthUrl.toString();
};

