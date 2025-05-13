// Time slot definition
export interface TimeSlot {
  hour: number;
  minute: number;
  formatted: string;
}

export interface GoogleEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string; date?: string };
  end: { dateTime: string; date?: string };
  location?: string;
  colorId?: string;
  attendees?: {
    email: string;
    displayName?: string;
    responseStatus?: string;
  }[];
  organizer?: {
    email: string;
  };
  conferenceData?: {
    conferenceId: string;
    createRequest?: {
      requestId: string;
      conferenceSolutionKey: {
        type: string;
      };
      status: {
        statusCode: string;
      };
    };
    entryPoints?: {
      entryPointType: string;
      uri: string;
      label?: string;
    }[];
  };
} 