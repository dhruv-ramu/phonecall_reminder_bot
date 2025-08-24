import { google } from 'googleapis';
import { logger } from '../utils/logger';
import { Config } from '../config/Config';
import { ReminderQueue } from '../queue/ReminderQueue';
import { CalendarEvent } from '../types/CalendarTypes';

export class GoogleCalendarService {
  private auth: any;
  private calendar: any;
  private config: Config;
  private reminderQueue: ReminderQueue;
  private isRunning = false;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor(config: Config, reminderQueue: ReminderQueue) {
    this.config = config;
    this.reminderQueue = reminderQueue;
    this.setupAuth();
  }

  private setupAuth(): void {
    try {
      // Check if service account key path is provided
      if (!this.config.googleServiceAccountKeyPath) {
        throw new Error('Google service account key path is not configured');
      }

      // Initialize Google Auth
      this.auth = new google.auth.GoogleAuth({
        keyFile: this.config.googleServiceAccountKeyPath,
        scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      });

      // Initialize Calendar API
      this.calendar = google.calendar({ version: 'v3', auth: this.auth });
      
      logger.info('✅ Google Calendar service initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize Google Calendar service:', error);
      throw error;
    }
  }

  /**
   * Start the calendar sync service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('⚠️ Google Calendar service is already running');
      return;
    }

    try {
      // Test the connection
      await this.testConnection();
      
      this.isRunning = true;
      
      // Start periodic sync
      this.startPeriodicSync();
      
      // Do initial sync
      await this.syncCalendarEvents();
      
      logger.info('🚀 Google Calendar service started successfully');
    } catch (error) {
      logger.error('❌ Failed to start Google Calendar service:', error);
      throw error;
    }
  }

  /**
   * Stop the calendar sync service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    logger.info('🛑 Google Calendar service stopped');
  }

  /**
   * Test the Google Calendar connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.calendar.calendarList.list();
      logger.info(`✅ Google Calendar connection successful. Found ${response.data.items?.length || 0} calendars`);
      return true;
    } catch (error) {
      logger.error('❌ Google Calendar connection failed:', error);
      return false;
    }
  }

  /**
   * Start periodic sync of calendar events
   */
  private startPeriodicSync(): void {
    // Sync every 5 minutes
    this.syncInterval = setInterval(async () => {
      try {
        await this.syncCalendarEvents();
      } catch (error) {
        logger.error('❌ Periodic calendar sync failed:', error);
      }
    }, 5 * 60 * 1000);

    logger.info('🔄 Started periodic calendar sync (every 5 minutes)');
  }

  /**
   * Sync calendar events and schedule reminders
   */
  async syncCalendarEvents(): Promise<void> {
    try {
      logger.info('🔄 Syncing Google Calendar events...');
      
      const events = await this.fetchUpcomingEvents();
      logger.info(`📅 Found ${events.length} upcoming events`);
      
      // Process each event and schedule reminders
      for (const event of events) {
        await this.processCalendarEvent(event);
      }
      
      logger.info('✅ Calendar sync completed');
    } catch (error) {
      logger.error('❌ Calendar sync failed:', error);
      throw error;
    }
  }

  /**
   * Fetch upcoming events from Google Calendar
   */
  private async fetchUpcomingEvents(): Promise<CalendarEvent[]> {
    try {
      const now = new Date();
      const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next 24 hours

      const response = await this.calendar.events.list({
        calendarId: this.config.googleCalendarId,
        timeMin: now.toISOString(),
        timeMax: endTime.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 50,
      });

      const events: CalendarEvent[] = [];
      
      if (response.data.items) {
        for (const item of response.data.items) {
          if (item.start && item.start.dateTime) {
            events.push({
              id: item.id || '',
              summary: item.summary || 'No Title',
              description: item.description || '',
              startTime: new Date(item.start.dateTime),
              endTime: item.end?.dateTime ? new Date(item.end.dateTime) : null,
              location: item.location || '',
              attendees: item.attendees?.map((a: any) => a.email || '') || [],
              calendarId: item.organizer?.email || this.config.googleCalendarId,
            });
          }
        }
      }

      return events;
    } catch (error) {
      logger.error('❌ Failed to fetch calendar events:', error);
      throw error;
    }
  }

  /**
   * Process a calendar event and schedule reminders
   */
  private async processCalendarEvent(event: CalendarEvent): Promise<void> {
    try {
      const now = new Date();
      const eventStart = event.startTime;
      const timeUntilEvent = eventStart.getTime() - now.getTime();
      
      // Only process events that are in the future
      if (timeUntilEvent <= 0) {
        return;
      }

      // Check if we should send a reminder (10 minutes before)
      const reminderTime = timeUntilEvent - (10 * 60 * 1000); // 10 minutes before
      
      if (reminderTime > 0) {
        // Schedule the reminder
        await this.scheduleEventReminder(event, reminderTime);
        logger.info(`📅 Scheduled reminder for event "${event.summary}" at ${new Date(now.getTime() + reminderTime).toLocaleString()}`);
      } else if (timeUntilEvent <= 10 * 60 * 1000 && timeUntilEvent > 0) {
        // Event is within 10 minutes, send immediate reminder
        await this.scheduleEventReminder(event, 0);
        logger.info(`🚨 Sending immediate reminder for event "${event.summary}" starting in ${Math.floor(timeUntilEvent / 60000)} minutes`);
      }
      
    } catch (error) {
      logger.error(`❌ Failed to process calendar event "${event.summary}":`, error);
    }
  }

  /**
   * Schedule a reminder for a calendar event
   */
  private async scheduleEventReminder(event: CalendarEvent, delayMs: number): Promise<void> {
    try {
      // Create reminder message
      const message = this.createReminderMessage(event);
      
      // Schedule the reminder
      await this.reminderQueue.addReminder(
        message,
        delayMs,
        'google-calendar', // Special user ID for calendar reminders
        'calendar-system', // Special channel ID
        `calendar-${event.id}`, // Special message ID
        {
          ttsVoice: 'alice',
          priority: 10, // High priority for calendar reminders
        }
      );

      logger.info(`✅ Calendar reminder scheduled for "${event.summary}"`);
      
    } catch (error) {
      logger.error(`❌ Failed to schedule calendar reminder for "${event.summary}":`, error);
    }
  }

  /**
   * Create a reminder message for a calendar event
   */
  private createReminderMessage(event: CalendarEvent): string {
    const startTime = event.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const location = event.location ? ` at ${event.location}` : '';
    
    let message = `Reminder: You have "${event.summary}" starting at ${startTime}${location}`;
    
    if (event.description) {
      message += `. ${event.description}`;
    }
    
    if (event.attendees.length > 0) {
      message += `. Attendees: ${event.attendees.join(', ')}`;
    }
    
    return message;
  }

  /**
   * Get upcoming events for a specific time range
   */
  async getUpcomingEvents(hours: number = 24): Promise<CalendarEvent[]> {
    try {
      const now = new Date();
      const endTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

      const response = await this.calendar.events.list({
        calendarId: this.config.googleCalendarId,
        timeMin: now.toISOString(),
        timeMax: endTime.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 100,
      });

      const events: CalendarEvent[] = [];
      
      if (response.data.items) {
        for (const item of response.data.items) {
          if (item.start && item.start.dateTime) {
            events.push({
              id: item.id || '',
              summary: item.summary || 'No Title',
              description: item.description || '',
              startTime: new Date(item.start.dateTime),
              endTime: item.end?.dateTime ? new Date(item.end.dateTime) : null,
              location: item.location || '',
              attendees: item.attendees?.map((a: any) => a.email || '') || [],
              calendarId: item.organizer?.email || this.config.googleCalendarId,
            });
          }
        }
      }

      return events;
    } catch (error) {
      logger.error('❌ Failed to fetch upcoming events:', error);
      throw error;
    }
  }

  /**
   * Get service status
   */
  getStatus(): { isRunning: boolean; lastSync?: Date } {
    return {
      isRunning: this.isRunning,
    };
  }
}
