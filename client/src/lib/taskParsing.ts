import { addDays, addMinutes, set, startOfDay, getDay, parseISO, isValid } from "date-fns";

// Types for parsed task information
export interface ParsedTaskInfo {
  hasTimeSpecification: boolean;
  hasDaySpecification: boolean;
  specifiedTime?: Date;
  specifiedDay?: Date;
  cleanTitle: string;
}

// Time parsing patterns
const TIME_PATTERNS = [
  // Standard time formats
  /\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i,
  /\bat\s+(\d{1,2})(?::(\d{2}))?\b/i, // 24-hour format
  /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i, // Just time without "at"
  /\bat\s+(\d{1,2})\s*o[''']?clock\b/i, // o'clock format with "at"
  /\b(\d{1,2})\s*o[''']?clock\b/i, // o'clock format without "at"
];

// Day parsing patterns
const DAY_PATTERNS = [
  /\bon\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  /\bon\s+(mon|tue|wed|thu|fri|sat|sun)\b/i,
  /\b(mon|tue|wed|thu|fri|sat|sun)\b/i,
];

// Day name to number mapping
const DAY_NAMES: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

/**
 * Parse time specification from task title
 */
function parseTime(title: string, baseDate: Date = new Date()): { time?: Date; cleanTitle: string } {
  let cleanTitle = title;
  
  for (const pattern of TIME_PATTERNS) {
    const match = title.match(pattern);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2] ? parseInt(match[2], 10) : 0;
      const ampm = match[3]?.toLowerCase();
      
      // Handle AM/PM conversion
      if (ampm === 'pm' && hours !== 12) {
        hours += 12;
      } else if (ampm === 'am' && hours === 12) {
        hours = 0;
      }
      
      // Validate time
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        const specifiedTime = set(baseDate, { 
          hours, 
          minutes, 
          seconds: 0, 
          milliseconds: 0 
        });
        
        // Remove the time specification from title
        cleanTitle = title.replace(match[0], '').trim();
        // Clean up extra spaces and prepositions
        cleanTitle = cleanTitle.replace(/\s+/g, ' ').replace(/^(at|on)\s+/i, '').trim();
        
        return { time: specifiedTime, cleanTitle };
      }
    }
  }
  
  return { cleanTitle };
}

/**
 * Parse day specification from task title
 */
function parseDay(title: string, baseDate: Date = new Date()): { day?: Date; cleanTitle: string } {
  let cleanTitle = title;
  
  for (const pattern of DAY_PATTERNS) {
    const match = title.match(pattern);
    if (match) {
      const dayName = match[1]?.toLowerCase();
      const targetDayNumber = DAY_NAMES[dayName];
      
      if (targetDayNumber !== undefined) {
        const currentDay = getDay(baseDate);
        let daysUntilTarget = targetDayNumber - currentDay;
        
        // If the target day is today or has passed this week, schedule for next week
        if (daysUntilTarget <= 0) {
          daysUntilTarget += 7;
        }
        
        const specifiedDay = startOfDay(addDays(baseDate, daysUntilTarget));
        
        // Remove the day specification from title
        cleanTitle = title.replace(match[0], '').trim();
        // Clean up extra spaces and prepositions
        cleanTitle = cleanTitle.replace(/\s+/g, ' ').replace(/^(at|on)\s+/i, '').trim();
        
        return { day: specifiedDay, cleanTitle };
      }
    }
  }
  
  return { cleanTitle };
}

/**
 * Parse task title for time and day specifications
 */
export function parseTaskTitle(title: string, baseDate: Date = new Date()): ParsedTaskInfo {
  let workingTitle = title;
  let specifiedTime: Date | undefined;
  let specifiedDay: Date | undefined;
  
  // First parse day, then time
  const dayResult = parseDay(workingTitle, baseDate);
  workingTitle = dayResult.cleanTitle;
  specifiedDay = dayResult.day;
  
  const timeResult = parseTime(workingTitle, specifiedDay || baseDate);
  workingTitle = timeResult.cleanTitle;
  
  // If we have both day and time, combine them
  if (specifiedDay && timeResult.time) {
    specifiedTime = set(specifiedDay, {
      hours: timeResult.time.getHours(),
      minutes: timeResult.time.getMinutes(),
      seconds: 0,
      milliseconds: 0
    });
  } else if (timeResult.time) {
    specifiedTime = timeResult.time;
  }
  
  return {
    hasTimeSpecification: !!specifiedTime,
    hasDaySpecification: !!specifiedDay,
    specifiedTime,
    specifiedDay: specifiedDay || (specifiedTime ? startOfDay(specifiedTime) : undefined),
    cleanTitle: workingTitle || title, // Fallback to original title if cleaning results in empty string
  };
}

/**
 * Check if a task conflicts with existing events at a specific time
 * Returns ALL events that overlap with the proposed time slot
 */
export function checkTimeConflict(
  proposedStart: Date, 
  duration: number, 
  existingEvents: Array<{ start_time: string; end_time: string; title?: string }>
): Array<{ start_time: string; end_time: string; title?: string }> {
  const proposedEnd = addMinutes(proposedStart, duration);
  const conflicts: Array<{ start_time: string; end_time: string; title?: string }> = [];
  
  for (const event of existingEvents) {
    if (!event.start_time || !event.end_time) continue;
    
    try {
      const eventStart = parseISO(event.start_time);
      const eventEnd = parseISO(event.end_time);
      
      if (!isValid(eventStart) || !isValid(eventEnd)) continue;
      
      // Check for ANY overlap between the proposed time slot and existing event
      // This covers all cases:
      // 1. Event starts before and ends during proposed slot
      // 2. Event starts during and ends after proposed slot  
      // 3. Event is completely within proposed slot
      // 4. Event completely encompasses proposed slot
      const hasOverlap = (
        (eventStart < proposedEnd && eventEnd > proposedStart) ||  // Any overlap
        (proposedStart < eventEnd && proposedEnd > eventStart)     // Reverse check for safety
      );
      
      if (hasOverlap) {
        conflicts.push(event);
      }
    } catch (e) {
      console.error("Error parsing event times during conflict check:", event, e);
    }
  }
  
  return conflicts;
} 