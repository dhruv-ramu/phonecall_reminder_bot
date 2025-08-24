import moment from 'moment';
import { TimeParseResult } from '../types/ReminderTypes';

export class TimeParser {
  private static readonly RELATIVE_TIME_REGEX = /^(\d+)([smhdw])$/i;
  private static readonly ABSOLUTE_TIME_REGEX = /^(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/i;
  private static readonly DATE_TIME_REGEX = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/i;
  private static readonly UNIX_TIMESTAMP_REGEX = /^\d{10,13}$/;

  /**
   * Parse a time string into milliseconds delay and absolute timestamp
   */
  static parseTime(timeString: string): TimeParseResult {
    const input = timeString.trim().toLowerCase();
    
    try {
      // Try relative time parsing first (e.g., "6h", "45m", "2d")
      const relativeResult = this.parseRelativeTime(input);
      if (relativeResult.isValid) {
        return relativeResult;
      }

      // Try absolute time parsing (e.g., "9:00am", "14:30")
      const absoluteResult = this.parseAbsoluteTime(input);
      if (absoluteResult.isValid) {
        return absoluteResult;
      }

      // Try date-time parsing (e.g., "12/25/2024 9:00am")
      const dateTimeResult = this.parseDateTime(input);
      if (dateTimeResult.isValid) {
        return dateTimeResult;
      }

      // Try UNIX timestamp parsing
      const unixResult = this.parseUnixTimestamp(input);
      if (unixResult.isValid) {
        return unixResult;
      }

      // Try natural language parsing
      const naturalResult = this.parseNaturalLanguage(input);
      if (naturalResult.isValid) {
        return naturalResult;
      }

      return {
        isValid: false,
        delayMs: 0,
        timestamp: new Date(),
        error: `Unable to parse time format: "${timeString}". Supported formats: 6h, 45m, 9:00am, 12/25/2024 9:00am, 1640995200, or "tomorrow 9am"`,
        originalInput: timeString,
      };

    } catch (error) {
      return {
        isValid: false,
        delayMs: 0,
        timestamp: new Date(),
        error: `Error parsing time: ${error instanceof Error ? error.message : 'Unknown error'}`,
        originalInput: timeString,
      };
    }
  }

  /**
   * Parse relative time formats like "6h", "45m", "2d", "1w"
   */
  private static parseRelativeTime(timeString: string): TimeParseResult {
    const match = timeString.match(this.RELATIVE_TIME_REGEX);
    if (!match) {
      return { isValid: false, delayMs: 0, timestamp: new Date(), originalInput: timeString };
    }

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    
    if (value <= 0) {
      return {
        isValid: false,
        delayMs: 0,
        timestamp: new Date(),
        error: 'Time value must be greater than 0',
        originalInput: timeString,
      };
    }

    let delayMs: number;
    switch (unit) {
      case 's':
        delayMs = value * 1000; // seconds
        break;
      case 'm':
        delayMs = value * 60 * 1000; // minutes
        break;
      case 'h':
        delayMs = value * 60 * 60 * 1000; // hours
        break;
      case 'd':
        delayMs = value * 24 * 60 * 60 * 1000; // days
        break;
      case 'w':
        delayMs = value * 7 * 24 * 60 * 60 * 1000; // weeks
        break;
      default:
        return {
          isValid: false,
          delayMs: 0,
          timestamp: new Date(),
          error: `Unknown time unit: ${unit}`,
          originalInput: timeString,
        };
    }

    const timestamp = new Date(Date.now() + delayMs);
    
    return {
      isValid: true,
      delayMs,
      timestamp,
      originalInput: timeString,
    };
  }

  /**
   * Parse absolute time formats like "9:00am", "14:30"
   */
  private static parseAbsoluteTime(timeString: string): TimeParseResult {
    const match = timeString.match(this.ABSOLUTE_TIME_REGEX);
    if (!match) {
      return { isValid: false, delayMs: 0, timestamp: new Date(), originalInput: timeString };
    }

    let hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    const period = match[3]?.toLowerCase();

    // Handle 12-hour format
    if (period === 'pm' && hour !== 12) {
      hour += 12;
    } else if (period === 'am' && hour === 12) {
      hour = 0;
    }

    // Validate time values
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return {
        isValid: false,
        delayMs: 0,
        timestamp: new Date(),
        error: 'Invalid time values',
        originalInput: timeString,
      };
    }

    const now = new Date();
    const targetTime = new Date(now);
    targetTime.setHours(hour, minute, 0, 0);

    // If the time has already passed today, schedule for tomorrow
    if (targetTime <= now) {
      targetTime.setDate(targetTime.getDate() + 1);
    }

    const delayMs = targetTime.getTime() - now.getTime();

    return {
      isValid: true,
      delayMs,
      timestamp: targetTime,
      originalInput: timeString,
    };
  }

  /**
   * Parse date-time formats like "12/25/2024 9:00am"
   */
  private static parseDateTime(timeString: string): TimeParseResult {
    const match = timeString.match(this.DATE_TIME_REGEX);
    if (!match) {
      return { isValid: false, delayMs: 0, timestamp: new Date(), originalInput: timeString };
    }

    const month = parseInt(match[1], 10) - 1; // Month is 0-indexed
    const day = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    let hour = parseInt(match[4], 10);
    const minute = parseInt(match[5], 10);
    const period = match[6]?.toLowerCase();

    // Handle 12-hour format
    if (period === 'pm' && hour !== 12) {
      hour += 12;
    } else if (period === 'am' && hour === 12) {
      hour = 0;
    }

    const targetTime = new Date(year, month, day, hour, minute, 0, 0);
    const now = new Date();

    // Validate the date
    if (isNaN(targetTime.getTime())) {
      return {
        isValid: false,
        delayMs: 0,
        timestamp: new Date(),
        error: 'Invalid date',
        originalInput: timeString,
      };
    }

    // Check if the date is in the past
    if (targetTime <= now) {
      return {
        isValid: false,
        delayMs: 0,
        timestamp: new Date(),
        error: 'Date is in the past',
        originalInput: timeString,
      };
    }

    const delayMs = targetTime.getTime() - now.getTime();

    return {
      isValid: true,
      delayMs,
      timestamp: targetTime,
      originalInput: timeString,
    };
  }

  /**
   * Parse UNIX timestamp formats
   */
  private static parseUnixTimestamp(timeString: string): TimeParseResult {
    if (!this.UNIX_TIMESTAMP_REGEX.test(timeString)) {
      return { isValid: false, delayMs: 0, timestamp: new Date(), originalInput: timeString };
    }

    const timestamp = parseInt(timeString, 10);
    let targetTime: Date;

    // Handle both seconds and milliseconds
    if (timeString.length === 10) {
      targetTime = new Date(timestamp * 1000); // Convert seconds to milliseconds
    } else {
      targetTime = new Date(timestamp);
    }

    const now = new Date();

    // Check if the timestamp is in the past
    if (targetTime <= now) {
      return {
        isValid: false,
        delayMs: 0,
        timestamp: new Date(),
        error: 'Timestamp is in the past',
        originalInput: timeString,
      };
    }

    const delayMs = targetTime.getTime() - now.getTime();

    return {
      isValid: true,
      delayMs,
      timestamp: targetTime,
      originalInput: timeString,
    };
  }

  /**
   * Parse natural language formats like "tomorrow 9am", "next week monday"
   */
  private static parseNaturalLanguage(timeString: string): TimeParseResult {
    const input = timeString.toLowerCase();
    
    try {
      // Use moment.js for natural language parsing
      const parsed = moment(input, [
        'tomorrow h:mma',
        'tomorrow h:mm a',
        'tomorrow h:mm',
        'next week monday',
        'next monday',
        'next tuesday',
        'next wednesday',
        'next thursday',
        'next friday',
        'next saturday',
        'next sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ], true);

      if (!parsed.isValid()) {
        return { isValid: false, delayMs: 0, timestamp: new Date(), originalInput: timeString };
      }

      const now = moment();

      // If the parsed time is before now, it might be next week
      if (parsed.isBefore(now)) {
        // For day names, assume next occurrence
        if (input.match(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i)) {
          parsed.add(1, 'week');
        }
      }

      const delayMs = parsed.valueOf() - now.valueOf();

      if (delayMs <= 0) {
        return {
          isValid: false,
          delayMs: 0,
          timestamp: new Date(),
          error: 'Parsed time is in the past',
          originalInput: timeString,
        };
      }

      return {
        isValid: true,
        delayMs,
        timestamp: parsed.toDate(),
        originalInput: timeString,
      };

    } catch (error) {
      return { isValid: false, delayMs: 0, timestamp: new Date(), originalInput: timeString };
    }
  }

  /**
   * Format a delay in milliseconds to a human-readable string
   */
  static formatDelay(delayMs: number): string {
    if (delayMs < 1000) {
      return `${delayMs}ms`;
    }

    const seconds = Math.floor(delayMs / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }

  /**
   * Validate if a delay is within acceptable limits
   */
  static validateDelay(delayMs: number, maxDays: number = 30): { isValid: boolean; error?: string } {
    const maxMs = maxDays * 24 * 60 * 60 * 1000;
    
    if (delayMs <= 0) {
      return { isValid: false, error: 'Delay must be greater than 0' };
    }
    
    if (delayMs > maxMs) {
      return { isValid: false, error: `Delay cannot exceed ${maxDays} days` };
    }
    
    return { isValid: true };
  }
}
