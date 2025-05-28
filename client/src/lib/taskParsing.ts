import { addDays, addMinutes, set, startOfDay, getDay, parseISO, isValid, isBefore } from "date-fns";

// Types for parsed task information
export interface ParsedTaskInfo {
  hasTimeSpecification: boolean;
  hasDaySpecification: boolean;
  hasDurationSpecification: boolean;
  specifiedTime?: Date;
  specifiedDay?: Date;
  specifiedDuration?: number; // in minutes
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

// Duration parsing patterns
const DURATION_PATTERNS = [
  /\bfor\s+(\d+(?:\.\d+)?)\s*(?:hour|hours|hr|hrs)\b/i,
  /\bfor\s+(\d+(?:\.\d+)?)\s*(?:minute|minutes|min|mins)\b/i,
  /\bfor\s+(\d+(?:\.\d+)?)\s*(?:h)\b/i,
  /\b(\d+(?:\.\d+)?)\s*(?:hour|hours|hr|hrs)\s*(?:long|duration)?\b/i,
  /\b(\d+(?:\.\d+)?)\s*(?:minute|minutes|min|mins)\s*(?:long|duration)?\b/i,
  /\b(\d+(?:\.\d+)?)\s*(?:h)\s*(?:long|duration)?\b/i,
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
 * Parse duration specification from task title
 */
function parseDuration(title: string): { duration?: number; cleanTitle: string } {
  let cleanTitle = title;
  
  for (const pattern of DURATION_PATTERNS) {
    const match = title.match(pattern);
    if (match) {
      const durationValue = parseFloat(match[1]);
      
      if (!isNaN(durationValue) && durationValue > 0) {
        let durationInMinutes: number;
        
        // Check if it's hours or minutes based on the pattern
        const fullMatch = match[0].toLowerCase();
        if (fullMatch.includes('hour') || fullMatch.includes('hr') || fullMatch.includes('h')) {
          durationInMinutes = durationValue * 60;
        } else {
          durationInMinutes = durationValue;
        }
        
        // Remove the duration specification from title
        cleanTitle = title.replace(match[0], '').trim();
        // Clean up extra spaces and prepositions
        cleanTitle = cleanTitle.replace(/\s+/g, ' ').replace(/^(for|of)\s+/i, '').trim();
        
        return { duration: durationInMinutes, cleanTitle };
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
 * Parse task title for time, day, and duration specifications
 */
export function parseTaskTitle(title: string, baseDate: Date = new Date()): ParsedTaskInfo {
  let workingTitle = title;
  let specifiedTime: Date | undefined;
  let specifiedDay: Date | undefined;
  let specifiedDuration: number | undefined;
  
  // First parse duration to extract it from the title
  const durationResult = parseDuration(workingTitle);
  workingTitle = durationResult.cleanTitle;
  specifiedDuration = durationResult.duration;
  
  // Then parse day
  const dayResult = parseDay(workingTitle, baseDate);
  workingTitle = dayResult.cleanTitle;
  specifiedDay = dayResult.day;
  
  // Finally parse time
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
    hasDurationSpecification: !!specifiedDuration,
    specifiedTime,
    specifiedDay: specifiedDay || (specifiedTime ? startOfDay(specifiedTime) : undefined),
    specifiedDuration,
    cleanTitle: workingTitle || title, // Fallback to original title if cleaning results in empty string
  };
}

/**
 * Check if a task conflicts with existing events at a specific time
 * Returns ALL events that overlap with the proposed time slot
 */
export const checkTimeConflict = (
  specifiedTime: Date, 
  duration: number, 
  existingEvents: Array<{ start_time: string; end_time: string; title?: string; source?: 'task' | 'calendar' }>
): { 
  moveableConflicts: Array<{ start_time: string; end_time: string; title?: string }>,
  immoveableConflicts: Array<{ start_time: string; end_time: string; title?: string }>
} => {
  const taskEndTime = addMinutes(specifiedTime, duration);
  const moveableConflicts: Array<{ start_time: string; end_time: string; title?: string }> = [];
  const immoveableConflicts: Array<{ start_time: string; end_time: string; title?: string }> = [];
  
  for (const event of existingEvents) {
    if (!event.start_time || !event.end_time) continue;
    
    try {
      const eventStart = parseISO(event.start_time);
      const eventEnd = parseISO(event.end_time);
      
      if (!isValid(eventStart) || !isValid(eventEnd)) continue;
      
      // Check for overlap: events overlap if one starts before the other ends
      const hasOverlap = isBefore(eventStart, taskEndTime) && isBefore(specifiedTime, eventEnd);
      
      if (hasOverlap) {
        const conflict = {
          start_time: event.start_time,
          end_time: event.end_time,
          title: event.title
        };
        
        if (event.source === 'calendar') {
          immoveableConflicts.push(conflict);
        } else {
          moveableConflicts.push(conflict);
        }
      }
    } catch (error) {
      console.error("Error parsing event times:", error);
    }
  }
  
  return { moveableConflicts, immoveableConflicts };
}; 