// Google Calendar event structure
export interface CalendarEvent {
  id: string;                    // Google Calendar event ID
  summary: string;               // Event title/summary
  description: string;           // Event description
  startTime: Date;               // Event start time
  endTime: Date | null;          // Event end time
  location: string;              // Event location
  attendees: string[];           // List of attendee emails
  calendarId: string;            // Calendar ID (usually 'primary')
}

// Calendar reminder structure
export interface CalendarReminder {
  eventId: string;               // Associated calendar event ID
  reminderTime: Date;            // When the reminder should fire
  message: string;               // TTS message to speak
  sent: boolean;                 // Whether reminder has been sent
  sentAt?: Date;                 // When reminder was sent
}

// Calendar sync status
export interface CalendarSyncStatus {
  isRunning: boolean;            // Whether sync service is running
  lastSync?: Date;               // Last successful sync time
  nextSync?: Date;               // Next scheduled sync time
  eventsCount: number;           // Number of events found
  remindersScheduled: number;    // Number of reminders scheduled
  errors: string[];              // Any sync errors
}

// Calendar configuration
export interface CalendarConfig {
  enabled: boolean;              // Whether calendar integration is enabled
  syncIntervalMinutes: number;   // How often to sync (default: 5 minutes)
  reminderAdvanceMinutes: number; // How many minutes before event to send reminder (default: 10)
  maxEventsToProcess: number;    // Maximum events to process per sync (default: 50)
  calendars: string[];           // List of calendar IDs to monitor
  includeAllDayEvents: boolean;  // Whether to include all-day events
  includeRecurringEvents: boolean; // Whether to include recurring events
}

// Calendar event filter options
export interface CalendarEventFilter {
  startDate?: Date;              // Start date for event range
  endDate?: Date;                // End date for event range
  searchQuery?: string;          // Search query for event titles/descriptions
  includeDeclined?: boolean;     // Whether to include declined events
  includeCancelled?: boolean;    // Whether to include cancelled events
  maxResults?: number;           // Maximum number of events to return
}

// Calendar reminder preferences
export interface CalendarReminderPreferences {
  enabled: boolean;              // Whether reminders are enabled
  advanceNoticeMinutes: number[]; // Multiple reminder times (e.g., [10, 30, 60] minutes before)
  ttsVoice: string;              // TTS voice to use
  includeLocation: boolean;      // Whether to include location in reminder
  includeDescription: boolean;   // Whether to include description in reminder
  includeAttendees: boolean;     // Whether to include attendee list
  customMessage?: string;        // Custom message prefix/suffix
}
