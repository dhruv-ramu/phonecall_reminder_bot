import {
  Client,
  GatewayIntentBits,
  Message,
  DMChannel,
  Events,
} from 'discord.js';
import { ReminderQueue } from '../queue/ReminderQueue';
import { Config } from '../config/Config';
import { logger } from '../utils/logger';
import { TimeParser } from '../utils/timeParser';
import { ParsedReminderCommand, DiscordCommandContext } from '../types/ReminderTypes';

export class DiscordBot {
  private client: Client;
  private config: Config;
  private reminderQueue: ReminderQueue;
  private commandPrefix = '?';

  constructor(config: Config, reminderQueue: ReminderQueue) {
    this.config = config;
    this.reminderQueue = reminderQueue;

    // Create Discord client with required intents
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Bot ready event
    this.client.on(Events.ClientReady, () => {
      logger.info(`🤖 Discord bot logged in as ${this.client.user?.tag}`);
      this.client.user?.setActivity('?remind for help', { type: 2 }); // Listening type
    });

    // Message event for command handling
    this.client.on(Events.MessageCreate, async (message: Message) => {
      await this.handleMessage(message);
    });

    // Error handling
    this.client.on(Events.Error, (error) => {
      logger.error('❌ Discord client error:', error);
    });

    this.client.on(Events.Warn, (warning) => {
      logger.warn('⚠️ Discord client warning:', warning);
    });
  }

  private async handleMessage(message: Message): Promise<void> {
    // Ignore bot messages and messages that don't start with the command prefix
    if (message.author.bot || !message.content.startsWith(this.commandPrefix)) {
      return;
    }

    try {
      const command = message.content.slice(this.commandPrefix.length).trim();
      
      if (command.startsWith('remind')) {
        await this.handleRemindCommand(message);
      } else if (command.startsWith('cancel')) {
        await this.handleCancelCommand(message);
      } else if (command.startsWith('list')) {
        await this.handleListCommand(message);
      } else if (command.startsWith('help')) {
        await this.handleHelpCommand(message);
      } else if (command.startsWith('status')) {
        await this.handleStatusCommand(message);
      } else if (command.startsWith('calendar')) {
        await this.handleCalendarCommand(message);
      }
    } catch (error) {
      logger.error('❌ Error handling message:', error);
      await this.sendErrorMessage(message.channel, 'An error occurred while processing your command.');
    }
  }

  private async handleRemindCommand(message: Message): Promise<void> {
    const content = message.content.slice(this.commandPrefix.length + 'remind'.length).trim();
    
    if (!content) {
      await this.sendErrorMessage(message.channel, 'Please provide a reminder message and time. Use `?help` for examples.');
      return;
    }

    // Parse the reminder command
    const parsed = this.parseReminderCommand(content);
    if (!parsed.isValid) {
      await this.sendErrorMessage(message.channel, parsed.error || 'Invalid reminder format.');
      return;
    }

    // Validate delay limits
    const delayValidation = TimeParser.validateDelay(parsed.delayMs, this.config.maxReminderDelayDays);
    if (!delayValidation.isValid) {
      await this.sendErrorMessage(message.channel, delayValidation.error || 'Invalid delay.');
      return;
    }

    try {
      // Create command context
      const context: DiscordCommandContext = {
        userId: message.author.id,
        username: message.author.username,
        channelId: message.channel.id,
        messageId: message.id,
        guildId: message.guild?.id,
        isDM: message.channel instanceof DMChannel,
      };

      // Add reminder to queue
      const job = await this.reminderQueue.addReminder(
        parsed.message,
        parsed.delayMs,
        context.userId,
        context.channelId,
        context.messageId
      );

      // Send confirmation message
      const formattedDelay = TimeParser.formatDelay(parsed.delayMs);
      const embed = {
        color: 0x00ff00,
        title: '✅ Reminder Set!',
        description: `**Message:** ${parsed.message}`,
        fields: [
          {
            name: '⏰ Time',
            value: `In ${formattedDelay} (${parsed.timestamp.toLocaleString()})`,
            inline: true,
          },
          {
            name: '🆔 Job ID',
            value: job.id || 'Unknown',
            inline: true,
          },
        ],
        timestamp: new Date(),
        footer: {
          text: 'Use ?cancel <job-id> to cancel this reminder',
        },
      };

      await this.safeSendMessage(message.channel, { embeds: [embed] });

      logger.info(`📅 Reminder scheduled: "${parsed.message}" for user ${context.username} in ${formattedDelay}`);

    } catch (error) {
      logger.error('❌ Failed to schedule reminder:', error);
      await this.sendErrorMessage(message.channel, 'Failed to schedule your reminder. Please try again.');
    }
  }

  private async handleCancelCommand(message: Message): Promise<void> {
    const content = message.content.slice(this.commandPrefix.length + 'cancel'.length).trim();
    
    if (!content) {
      await this.sendErrorMessage(message.channel, 'Please provide a job ID to cancel. Use `?list` to see your reminders.');
      return;
    }

    try {
      const cancelled = await this.reminderQueue.cancelReminder(content);
      
      if (cancelled) {
        const embed = {
          color: 0xff9900,
          title: '❌ Reminder Cancelled',
          description: `Successfully cancelled reminder with ID: ${content}`,
          timestamp: new Date(),
        };
        
        await this.safeSendMessage(message.channel, { embeds: [embed] });
      } else {
        await this.sendErrorMessage(message.channel, `No reminder found with ID: ${content}`);
      }
    } catch (error) {
      logger.error('❌ Error cancelling reminder:', error);
      await this.sendErrorMessage(message.channel, 'Failed to cancel the reminder. Please try again.');
    }
  }

  private async handleListCommand(message: Message): Promise<void> {
    try {
      const reminders = await this.reminderQueue.getUserReminders(message.author.id);
      
      if (reminders.length === 0) {
        const embed = {
          color: 0x0099ff,
          title: '📋 Your Reminders',
          description: 'You have no active reminders.',
          timestamp: new Date(),
        };
        
        await this.safeSendMessage(message.channel, { embeds: [embed] });
        return;
      }

      const embed = {
        color: 0x0099ff,
        title: '📋 Your Active Reminders',
        fields: reminders.map((reminder, index) => ({
          name: `${index + 1}. ${reminder.data.message}`,
          value: `ID: ${reminder.id}\nScheduled: ${new Date(reminder.opts.delay! + Date.now()).toLocaleString()}`,
          inline: false,
        })),
        timestamp: new Date(),
        footer: {
          text: `Total: ${reminders.length} reminder(s)`,
        },
      };

      await this.safeSendMessage(message.channel, { embeds: [embed] });

    } catch (error) {
      logger.error('❌ Error listing reminders:', error);
      await this.sendErrorMessage(message.channel, 'Failed to retrieve your reminders. Please try again.');
    }
  }

  private async handleHelpCommand(message: Message): Promise<void> {
    const helpEmbed = {
      color: 0x0099ff,
      title: '🤖 Discord Reminder Bot Help',
      description: 'Set reminders that will call your phone at the specified time!',
      fields: [
        {
          name: '📝 Set a Reminder',
          value: '`?remind <message> -t <time>`\n\n**Time Formats:**\n• `6h` - 6 hours from now\n• `45m` - 45 minutes from now\n• `9:00am` - 9 AM today/tomorrow\n• `12/25/2024 9:00am` - Specific date and time\n• `1640995200` - UNIX timestamp',
          inline: false,
        },
        {
          name: '❌ Cancel a Reminder',
          value: '`?cancel <job-id>`\nUse `?list` to see your active reminders and their IDs.',
          inline: false,
        },
        {
          name: '📋 List Your Reminders',
          value: '`?list`\nShows all your active reminders.',
          inline: false,
        },
        {
          name: '📊 Check Bot Status',
          value: '`?status`\nShows bot and queue statistics.',
          inline: false,
        },
        {
          name: '📅 Google Calendar Integration',
          value: '`?calendar events` - View upcoming calendar events\n`?calendar sync` - Manually sync calendar\n`?calendar status` - Check calendar integration status',
          inline: false,
        },
        {
          name: '💡 Examples',
          value: '```\n?remind Attend meeting! -t 6h\n?remind Call mom -t 2h30m\n?remind Daily standup -t 9am\n?remind Project deadline -t 12/31/2024 5pm\n?calendar events\n?calendar sync```',
          inline: false,
        },
      ],
      timestamp: new Date(),
      footer: {
        text: 'Reminders will call your phone number when due',
      },
    };

    await this.safeSendMessage(message.channel, { embeds: [helpEmbed] });
  }

  private async handleStatusCommand(message: Message): Promise<void> {
    try {
      const stats = await this.reminderQueue.getQueueStats();

      const statusEmbed = {
        color: 0x00ff00,
        title: '📊 Bot Status',
        fields: [
          {
            name: '🟢 Bot Status',
            value: 'Online and running',
            inline: true,
          },
          {
            name: '📋 Queue Statistics',
            value: `Waiting: ${stats.waiting}\nActive: ${stats.active}\nCompleted: ${stats.completed}\nFailed: ${stats.failed}\nDelayed: ${stats.delayed}`,
            inline: false,
          },
        ],
        timestamp: new Date(),
      };

      await this.safeSendMessage(message.channel, { embeds: [statusEmbed] });

    } catch (error) {
      logger.error('❌ Error getting status:', error);
      await this.sendErrorMessage(message.channel, 'Failed to retrieve bot status. Please try again.');
    }
  }

  private async handleCalendarCommand(message: Message): Promise<void> {
    const content = message.content.slice(this.commandPrefix.length + 'calendar'.length).trim();
    
    if (!content) {
      await this.sendErrorMessage(message.channel, 'Please specify a calendar action. Use `?help` for examples.');
      return;
    }

    const action = content.split(' ')[0].toLowerCase();
    
    switch (action) {
      case 'events':
        await this.handleCalendarEventsCommand(message);
        break;
      case 'sync':
        await this.handleCalendarSyncCommand(message);
        break;
      case 'status':
        await this.handleCalendarStatusCommand(message);
        break;
      default:
        await this.sendErrorMessage(message.channel, `Unknown calendar action: ${action}. Use \`?help\` for available actions.`);
    }
  }

  private async handleCalendarEventsCommand(message: Message): Promise<void> {
    try {
      // This would integrate with GoogleCalendarService to show upcoming events
      const embed = {
        color: 0x4285f4, // Google Calendar blue
        title: '📅 Google Calendar Events',
        description: 'Calendar integration is being set up. This feature will show your upcoming events and automatically send phone reminders.',
        fields: [
          {
            name: '🔄 Status',
            value: 'Calendar integration is being configured',
            inline: true,
          },
          {
            name: '⏰ Reminder Timing',
            value: '10 minutes before each event',
            inline: true,
          },
        ],
        timestamp: new Date(),
        footer: {
          text: 'Use ?calendar sync to manually sync events',
        },
      };

      await this.safeSendMessage(message.channel, { embeds: [embed] });

    } catch (error) {
      logger.error('❌ Error handling calendar events command:', error);
      await this.sendErrorMessage(message.channel, 'Failed to retrieve calendar events. Please try again.');
    }
  }

  private async handleCalendarSyncCommand(message: Message): Promise<void> {
    try {
      const embed = {
        color: 0x4285f4,
        title: '🔄 Calendar Sync',
        description: 'Calendar sync is being set up. This will automatically sync your Google Calendar every 5 minutes.',
        fields: [
          {
            name: '📱 Phone Reminders',
            value: 'You will receive phone calls 10 minutes before each calendar event',
            inline: false,
          },
        ],
        timestamp: new Date(),
      };

      await this.safeSendMessage(message.channel, { embeds: [embed] });

    } catch (error) {
      logger.error('❌ Error handling calendar sync command:', error);
      await this.sendErrorMessage(message.channel, 'Failed to sync calendar. Please try again.');
    }
  }

  private async handleCalendarStatusCommand(message: Message): Promise<void> {
    try {
      const embed = {
        color: 0x4285f4,
        title: '📊 Calendar Status',
        description: 'Google Calendar integration status',
        fields: [
          {
            name: '🔗 Connection',
            value: 'Being configured',
            inline: true,
          },
          {
            name: '🔄 Sync Interval',
            value: 'Every 5 minutes',
            inline: true,
          },
          {
            name: '⏰ Reminder Advance',
            value: '10 minutes before events',
            inline: true,
          },
        ],
        timestamp: new Date(),
      };

      await this.safeSendMessage(message.channel, { embeds: [embed] });

    } catch (error) {
      logger.error('❌ Error handling calendar status command:', error);
      await this.sendErrorMessage(message.channel, 'Failed to get calendar status. Please try again.');
    }
  }

  private parseReminderCommand(content: string): ParsedReminderCommand {
    // Look for the -t flag for time
    const timeMatch = content.match(/-t\s+(\S+)/);
    if (!timeMatch) {
      return {
        message: content,
        delayMs: 0,
        timestamp: new Date(),
        isValid: false,
        error: 'Missing time parameter. Use -t <time> to specify when the reminder should fire.',
      };
    }

    const timeString = timeMatch[1];
    const message = content.replace(/-t\s+\S+/, '').trim();

    if (!message) {
      return {
        message: '',
        delayMs: 0,
        timestamp: new Date(),
        isValid: false,
        error: 'Missing reminder message.',
      };
    }

    // Parse the time string
    const timeResult = TimeParser.parseTime(timeString);
    if (!timeResult.isValid) {
      return {
        message,
        delayMs: 0,
        timestamp: new Date(),
        isValid: false,
        error: timeResult.error,
      };
    }

    return {
      message,
      delayMs: timeResult.delayMs,
      timestamp: timeResult.timestamp,
      isValid: true,
    };
  }

  private async sendErrorMessage(channel: any, message: string): Promise<void> {
    const errorEmbed = {
      color: 0xff0000,
      title: '❌ Error',
      description: message,
      timestamp: new Date(),
    };

    await this.safeSendMessage(channel, { embeds: [errorEmbed] });
  }

  private async safeSendMessage(channel: any, content: any): Promise<void> {
    try {
      if (channel && typeof channel.send === 'function') {
        await channel.send(content);
      }
    } catch (error) {
      logger.error('❌ Failed to send message:', error);
    }
  }

  async start(): Promise<void> {
    try {
      await this.client.login(this.config.discordToken);
      logger.info('✅ Discord bot started successfully');
    } catch (error) {
      logger.error('❌ Failed to start Discord bot:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      await this.client.destroy();
      await this.reminderQueue.close();
      logger.info('✅ Discord bot stopped successfully');
    } catch (error) {
      logger.error('❌ Error stopping Discord bot:', error);
      throw error;
    }
  }

  getClient(): Client {
    return this.client;
  }
}
