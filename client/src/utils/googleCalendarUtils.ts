/**
 * Utility functions for Google Calendar integration
 */

/**
 * Generates the Google OAuth URL for calendar authorization
 * @param userId The user ID to include in the state parameter
 * @returns The complete OAuth URL
 */
export function generateGoogleAuthUrl(userId: string): string {
  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI || 'https://groov-tasks.vercel.app/auth/google/callback';
  const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';
  
  if (!CLIENT_ID) {
    throw new Error('Missing Google Client ID');
  }

  // Create a state parameter with user ID and a nonce for security
  const state = JSON.stringify({
    user_id: userId,
    nonce: Math.random().toString(36).substring(2)
  });

  // Store the state in localStorage to verify on callback
  localStorage.setItem('googleOAuthState', state);

  // Build the OAuth URL
  const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  oauthUrl.searchParams.append('client_id', CLIENT_ID);
  oauthUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  oauthUrl.searchParams.append('response_type', 'code');
  oauthUrl.searchParams.append('scope', SCOPES);
  oauthUrl.searchParams.append('access_type', 'offline');
  oauthUrl.searchParams.append('prompt', 'consent');
  oauthUrl.searchParams.append('state', state);

  return oauthUrl.toString();
}

/**
 * Formats Google Calendar events to a standard format
 * @param events The raw events from Google Calendar API
 * @returns Formatted calendar events
 */
export function formatGoogleEvents(events: any[]) {
  return events.map(event => ({
    id: event.id,
    title: event.summary,
    description: event.description,
    start: event.start.dateTime || event.start.date,
    end: event.end.dateTime || event.end.date,
    location: event.location,
    color: event.colorId ? getColorForId(event.colorId) : '#039be5', // Default blue
    provider: 'google',
    htmlLink: event.htmlLink,
    status: event.status
  }));
}

/**
 * Maps Google Calendar color IDs to hex colors
 * @param colorId The Google Calendar color ID
 * @returns A hex color string
 */
function getColorForId(colorId: string): string {
  const colorMap: Record<string, string> = {
    '1': '#7986cb', // Lavender
    '2': '#33b679', // Sage
    '3': '#8e24aa', // Grape
    '4': '#e67c73', // Flamingo
    '5': '#f6c026', // Banana
    '6': '#f5511d', // Tangerine
    '7': '#039be5', // Peacock
    '8': '#616161', // Graphite
    '9': '#3f51b5', // Blueberry
    '10': '#0b8043', // Basil
    '11': '#d60000', // Tomato
  };
  
  return colorMap[colorId] || '#039be5'; // Default to Peacock blue
}

