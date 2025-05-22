/**
 * Utility functions for Microsoft Outlook Calendar integration
 */

/**
 * Generates the Microsoft OAuth URL for calendar authorization
 * @param userId The user ID to include in the state parameter
 * @returns The complete OAuth URL
 */
export function generateMicrosoftAuthUrl(userId: string): string {
  const CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
  const REDIRECT_URI = import.meta.env.VITE_MICROSOFT_REDIRECT_URI || 'https://groov-tasks.vercel.app/auth/microsoft/callback';
  const SCOPES = 'Calendars.Read offline_access';
  
  if (!CLIENT_ID) {
    throw new Error('Missing Microsoft Client ID');
  }

  // Create a state parameter with user ID and a nonce for security
  const state = JSON.stringify({
    user_id: userId,
    nonce: Math.random().toString(36).substring(2)
  });

  // Store the state in localStorage to verify on callback
  localStorage.setItem('microsoftOAuthState', state);

  // Build the OAuth URL
  const oauthUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
  oauthUrl.searchParams.append('client_id', CLIENT_ID);
  oauthUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  oauthUrl.searchParams.append('response_type', 'code');
  oauthUrl.searchParams.append('scope', SCOPES);
  oauthUrl.searchParams.append('response_mode', 'query');
  oauthUrl.searchParams.append('state', state);

  return oauthUrl.toString();
}

/**
 * Formats Microsoft Outlook Calendar events to a standard format
 * @param events The raw events from Microsoft Graph API
 * @returns Formatted calendar events
 */
export function formatMicrosoftEvents(events: any[]) {
  return events.map(event => ({
    id: event.id,
    title: event.subject,
    description: event.bodyPreview,
    start: event.start.dateTime,
    end: event.end.dateTime,
    location: event.location?.displayName,
    color: getMicrosoftEventColor(event.importance, event.showAs),
    provider: 'microsoft',
    status: event.showAs
  }));
}

/**
 * Determines a color based on Microsoft event properties
 * @param importance The importance level of the event
 * @param showAs The availability status of the event
 * @returns A hex color string
 */
function getMicrosoftEventColor(importance: string, showAs: string): string {
  // Color based on importance
  if (importance === 'high') {
    return '#d60000'; // Red for high importance
  }
  
  // Color based on availability
  switch (showAs) {
    case 'busy':
      return '#0078d4'; // Blue for busy
    case 'tentative':
      return '#8e24aa'; // Purple for tentative
    case 'oof':
      return '#e67c73'; // Red-orange for out of office
    case 'workingElsewhere':
      return '#33b679'; // Green for working elsewhere
    case 'free':
      return '#616161'; // Gray for free
    default:
      return '#0078d4'; // Default blue
  }
}

