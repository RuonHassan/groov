import type { ConnectedCalendar } from '@shared/schema';

// Track initialization state
let isInitializing = false;
let isInitialized = false;

// Initialize Google API client
export const initializeGoogleApi = async () => {
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

    const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
    const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';

    if (!API_KEY) {
      throw new Error('Google API Key is not set in environment variables');
    }

    if (!window.gapi) {
      await new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = resolve;
        document.body.appendChild(script);
      });
    }

    if (!window.gapi.client) {
      await new Promise((resolve) => window.gapi.load('client', resolve));
    }

    if (!window.gapi.client.calendar) {
      await window.gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
      });
    }

    isInitialized = true;
  } finally {
    isInitializing = false;
  }
};

// Fetch events from Google Calendar
export const fetchGoogleEvents = async (
  calendar: ConnectedCalendar,
  timeMin: Date,
  timeMax: Date
): Promise<any[]> => {
  try {
    // Set the token for this request
    window.gapi.client.setToken({ 
      access_token: calendar.access_token
    });

    const response = await window.gapi.client.calendar.events.list({
      calendarId: calendar.calendar_id,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      showDeleted: false,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100,
    });

    return response.result.items || [];
  } catch (error: any) {
    console.error('Error fetching Google calendar events:', error);
    throw error;
  }
};

// Generate Google OAuth URL
export const generateGoogleAuthUrl = (userId: string): string => {
  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI || 'https://groov-tasks.vercel.app/auth/google/callback';
  const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

  if (!CLIENT_ID) {
    throw new Error('Missing Google Client ID');
  }

  const state = JSON.stringify({
    user_id: userId,
    nonce: Math.random().toString(36).substring(2)
  });

  // Store state for verification during callback
  localStorage.setItem('googleOAuthState', state);

  const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  oauthUrl.searchParams.append('client_id', CLIENT_ID);
  oauthUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  oauthUrl.searchParams.append('response_type', 'code');
  oauthUrl.searchParams.append('scope', SCOPES);
  oauthUrl.searchParams.append('access_type', 'offline');
  oauthUrl.searchParams.append('prompt', 'consent');
  oauthUrl.searchParams.append('state', state);

  return oauthUrl.toString();
};

