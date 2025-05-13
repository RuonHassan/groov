import { format, parseISO, isValid } from 'date-fns';
import { TimeSlot } from './types';

// Calendar time configuration
export const CALENDAR_START_HOUR = 8;
export const CALENDAR_END_HOUR = 19; // Extended to 7 PM to include the last slot
export const TOTAL_CALENDAR_MINUTES = (CALENDAR_END_HOUR - CALENDAR_START_HOUR) * 60;

// Generate time slots from 8 AM to 6 PM
export function generateTimeSlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let hour = CALENDAR_START_HOUR; hour < CALENDAR_END_HOUR; hour++) {
    // Add the hour slot (XX:00)
    slots.push({
      hour,
      minute: 0,
      formatted: format(new Date().setHours(hour, 0), 'h:mm a')
    });
    
    // Add the half-hour slot (XX:30)
    slots.push({
      hour,
      minute: 30,
      formatted: format(new Date().setHours(hour, 30), 'h:mm a')
    });
  }
  return slots;
}

// Helper function to round a date to the nearest 15 minutes
export const roundToNearest15Minutes = (date: Date): Date => {
  const minutes = date.getMinutes();
  const remainder = minutes % 15;
  const roundedMinutes = remainder < 8 ? minutes - remainder : minutes + (15 - remainder);
  const newDate = new Date(date);
  newDate.setMinutes(roundedMinutes);
  return newDate;
};

// Check if a task or event overlaps with a specific time slot
export const isItemInTimeSlot = (startTime: string | null, endTime: string | null, date: Date, timeSlot: TimeSlot): boolean => {
  if (!startTime || !endTime) return false;
  
  try {
    const itemStart = parseISO(startTime);
    const itemEnd = parseISO(endTime);
    if (!isValid(itemStart) || !isValid(itemEnd)) return false;

    const slotStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), timeSlot.hour, timeSlot.minute);
    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000); // 30 minutes instead of 60

    return itemStart < slotEnd && itemEnd > slotStart;
  } catch (e) {
    console.error("Error parsing dates:", e);
    return false;
  }
}; 