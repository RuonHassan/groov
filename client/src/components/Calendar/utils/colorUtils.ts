import { Task } from '@shared/schema';
import { GoogleEvent } from './types';

// Helper function to check if a color is light
export function isLightColor(color: string): boolean {
  const c = color.substring(1);
  const rgb = parseInt(c, 16);
  const luma = (rgb >> 16) * 0.299 + (rgb >> 8 & 255) * 0.587 + (rgb & 255) * 0.114;
  return luma > 128;
}

// Get color based on task's color property
export function getTaskColor(task: Task): string {
  return task.color || '#3b82f6'; // Default to blue if no color specified
}

// Check if a Google Calendar event has external attendees
export function hasExternalAttendees(event: GoogleEvent): boolean {
  if (!event.attendees || !event.organizer) return false;
  
  const organizerDomain = event.organizer.email.split('@')[1];
  return event.attendees.some(attendee => {
    const attendeeDomain = attendee.email.split('@')[1];
    return attendeeDomain !== organizerDomain;
  });
}

// Get text color based on background color
export function getTextColor(bgColor: string): string {
  return isLightColor(bgColor) ? 'text-gray-900' : 'text-white';
}

// Get event color based on type and settings
export function getEventColor(event: GoogleEvent, defaultGcalColor: string, externalMeetingColor: string): string {
  return hasExternalAttendees(event) ? externalMeetingColor : defaultGcalColor;
} 