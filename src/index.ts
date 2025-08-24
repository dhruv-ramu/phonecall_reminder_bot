import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { DiscordBot } from './bot/DiscordBot';
import { RedisConnection } from './queue/RedisConnection';
import { ReminderQueue } from './queue/ReminderQueue';
import { ReminderWorker } from './worker/ReminderWorker';
import { GoogleCalendarService } from './calendar/GoogleCalendarService';
import { Config } from './config/Config';

// Load environment variables
dotenv.config();

async function main() {
  try {
    logger.info('🚀 Starting Discord Reminder Bot with Google Calendar Integration...');

    // Initialize configuration
    const config = new Config();
    logger.info('✅ Configuration loaded');

    // Initialize Redis connection
    const redisConnection = new RedisConnection(config);
    await redisConnection.connect();
    logger.info('✅ Redis connected');

    // Initialize reminder queue
    const reminderQueue = new ReminderQueue(redisConnection);
    
    // Initialize reminder worker with the queue
    const reminderWorker = new ReminderWorker(redisConnection, reminderQueue);
    await reminderWorker.start();
    logger.info('✅ Reminder worker started');

    // Initialize Google Calendar service (if enabled)
    let calendarService: GoogleCalendarService | null = null;
    if (config.googleCalendarEnabled) {
      try {
        calendarService = new GoogleCalendarService(config, reminderQueue);
        await calendarService.start();
        logger.info('✅ Google Calendar service started');
      } catch (error) {
        logger.error('❌ Failed to start Google Calendar service:', error);
        logger.warn('⚠️ Continuing without Google Calendar integration');
      }
    } else {
      logger.info('ℹ️ Google Calendar integration is disabled');
    }

    // Initialize Discord bot
    const discordBot = new DiscordBot(config, reminderQueue);
    await discordBot.start();
    logger.info('✅ Discord bot started');

    // Graceful shutdown handling
    process.on('SIGINT', async () => {
      logger.info('🛑 Shutting down gracefully...');
      
      await discordBot.stop();
      await reminderWorker.stop();
      if (calendarService) {
        await calendarService.stop();
      }
      await redisConnection.disconnect();
      
      logger.info('✅ Shutdown complete');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('🛑 Received SIGTERM, shutting down...');
      
      await discordBot.stop();
      await reminderWorker.stop();
      if (calendarService) {
        await calendarService.stop();
      }
      await redisConnection.disconnect();
      
      logger.info('✅ Shutdown complete');
      process.exit(0);
    });

    logger.info('🎉 Discord Reminder Bot is now running!');
    logger.info(`📱 Target phone: ${config.targetPhoneNumber}`);
    logger.info(`🔔 Use ?remind <message> -t <delay> to set reminders`);
    if (config.googleCalendarEnabled) {
      logger.info(`📅 Google Calendar integration: ENABLED (${config.calendarReminderAdvanceMinutes} min advance)`);
    }

  } catch (error) {
    logger.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

main().catch((error) => {
  logger.error('❌ Application startup failed:', error);
  process.exit(1);
});
