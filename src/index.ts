import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { DiscordBot } from './bot/DiscordBot';
import { RedisConnection } from './queue/RedisConnection';
import { ReminderWorker } from './worker/ReminderWorker';
import { Config } from './config/Config';

// Load environment variables
dotenv.config();

async function main() {
  try {
    logger.info('🚀 Starting Discord Reminder Bot...');

    // Initialize configuration
    const config = new Config();
    logger.info('✅ Configuration loaded');

    // Initialize Redis connection
    const redisConnection = new RedisConnection();
    await redisConnection.connect();
    logger.info('✅ Redis connected');

    // Initialize reminder worker
    const reminderWorker = new ReminderWorker(redisConnection);
    await reminderWorker.start();
    logger.info('✅ Reminder worker started');

    // Initialize Discord bot
    const discordBot = new DiscordBot(config, redisConnection);
    await discordBot.start();
    logger.info('✅ Discord bot started');

    // Graceful shutdown handling
    process.on('SIGINT', async () => {
      logger.info('🛑 Shutting down gracefully...');
      
      await discordBot.stop();
      await reminderWorker.stop();
      await redisConnection.disconnect();
      
      logger.info('✅ Shutdown complete');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('🛑 Received SIGTERM, shutting down...');
      
      await discordBot.stop();
      await reminderWorker.stop();
      await redisConnection.disconnect();
      
      logger.info('✅ Shutdown complete');
      process.exit(0);
    });

    logger.info('🎉 Discord Reminder Bot is now running!');
    logger.info(`📱 Target phone: ${config.targetPhoneNumber}`);
    logger.info(`🔔 Use ?remind <message> -t <delay> to set reminders`);

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
