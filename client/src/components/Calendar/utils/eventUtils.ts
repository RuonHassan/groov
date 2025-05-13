import { Task } from "@shared/schema";
import { GoogleEvent } from './types';
import { parseISO } from 'date-fns';

// Helper function to check if an event has external attendees
export const hasExternalAttendees = (event: GoogleEvent) => {
  if (!event.attendees || event.attendees.length === 0) return false;
  
  // Get the organizer's email domain
  const organizerEmail = event.organizer?.email;
  if (!organizerEmail) return false;

  // Skip if organizer is a group/resource calendar
  if (organizerEmail.includes('group.calendar.google.com') || 
      organizerEmail.includes('resource.calendar.google.com')) {
    return false;
  }

  // Get the organization's base domain (e.g., 'beauhurst.com')
  const organizerDomain = organizerEmail.split('@')[1].split('.').slice(-2).join('.');

  // Check if any attendee has a different domain
  return event.attendees.some(attendee => {
    const email = attendee.email;
    // Skip group calendars and room resources
    if (email.includes('group.calendar.google.com') || 
        email.includes('resource.calendar.google.com')) {
      return false;
    }
    // Check if attendee's domain is different from organizer's
    const attendeeDomain = email.split('@')[1].split('.').slice(-2).join('.');
    return attendeeDomain !== organizerDomain;
  });
};

// Helper function to calculate task position from drag event
export const calculateTaskPosition = (event: DragEvent, timeSlotElement: HTMLElement, date: Date, task: Task): { startTime: Date, endTime: Date } | null => {
  const rect = timeSlotElement.getBoundingClientRect();
  const relativeY = event.clientY - rect.top;
  const percentageInSlot = relativeY / rect.height;
  
  // Calculate if we're in the first or second 15-minute block
  const isFirstBlock = percentageInSlot < 0.5;
  
  // Get the base time from the time slot
  const hour = parseInt(timeSlotElement.dataset.hour || "0");
  const slotMinute = parseInt(timeSlotElement.dataset.minute || "0");
  
  // Create the new start time
  const startTime = new Date(date);
  startTime.setHours(hour, slotMinute + (isFirstBlock ? 0 : 15));
  
  // Calculate the original duration
  const originalStart = parseISO(task.start_time!);
  const originalEnd = parseISO(task.end_time!);
  const durationInMinutes = (originalEnd.getTime() - originalStart.getTime()) / (1000 * 60);
  
  // Create end time by adding the original duration
  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + durationInMinutes);
  
  return { startTime, endTime };
};

// Helper function to check if a color is light
export const isLightColor = (color: string): boolean => {
  const c = color.substring(1);
  const rgb = parseInt(c, 16);
  const luma = (rgb >> 16) * 0.299 + (rgb >> 8 & 255) * 0.587 + (rgb & 255) * 0.114;
  return luma > 128;
}; 