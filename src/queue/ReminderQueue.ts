import { Queue, Job, Worker } from 'bullmq';
import { RedisConnection } from './RedisConnection';
import { logger } from '../utils/logger';
import { ReminderJobData, ReminderJobResult } from '../types/ReminderTypes';

export class ReminderQueue {
  private queue: Queue<ReminderJobData, ReminderJobResult>;
  private worker: Worker<ReminderJobData, ReminderJobResult>;
  private redisConnection: RedisConnection;

  constructor(redisConnection: RedisConnection) {
    this.redisConnection = redisConnection;
    
    // Create the reminder queue
    this.queue = new Queue<ReminderJobData, ReminderJobResult>('reminders', {
      connection: this.redisConnection.getClient(),
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50,      // Keep last 50 failed jobs
        attempts: 3,            // Retry failed jobs up to 3 times
        backoff: {
          type: 'exponential',
          delay: 2000,         // Start with 2 second delay
        },
      },
    });

    // Note: QueueScheduler removed for BullMQ v5 compatibility
    // Delayed jobs are handled automatically by the Queue

    // Create worker to process jobs
    this.worker = new Worker<ReminderJobData, ReminderJobResult>(
      'reminders',
      async (job) => {
        return await this.processReminderJob(job);
      },
      {
        connection: this.redisConnection.getClient(),
        concurrency: 5, // Process up to 5 reminders concurrently
      }
    );

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Worker events only - queue events removed for BullMQ v5 compatibility
    this.worker.on('error', (error) => {
      logger.error('❌ Worker error:', error);
    });

    this.worker.on('failed', (job, error) => {
      logger.error(`❌ Job ${job?.id} failed in worker:`, error);
    });
  }

  private async processReminderJob(job: Job<ReminderJobData, ReminderJobResult>): Promise<ReminderJobResult> {
    const { message, userId, channelId, messageId } = job.data;
    
    logger.info(`🔔 Processing reminder: "${message}" for user ${userId}`);
    
    // This is a placeholder - the actual Twilio call will be made by the ReminderWorker
    // which listens to completed jobs
    return {
      success: true,
      messageId: job.id as string,
      timestamp: new Date().toISOString(),
      message: 'Reminder processed successfully',
    };
  }

  async addReminder(
    message: string,
    delayMs: number,
    userId: string,
    channelId: string,
    messageId: string,
    options?: {
      ttsVoice?: string;
      audioFile?: string;
      priority?: number;
    }
  ): Promise<Job<ReminderJobData, ReminderJobResult>> {
    try {
      const jobData: ReminderJobData = {
        message,
        userId,
        channelId,
        messageId,
        ttsVoice: options?.ttsVoice || 'alice',
        audioFile: options?.audioFile,
        priority: options?.priority || 0,
        createdAt: new Date().toISOString(),
      };

      const job = await this.queue.add(
        'reminder',
        jobData,
        {
          delay: delayMs,
          priority: options?.priority || 0,
          jobId: `remind-${messageId}-${Date.now()}`,
        }
      );

      logger.info(`📅 Scheduled reminder "${message}" for ${new Date(Date.now() + delayMs).toISOString()}`);
      
      return job;
    } catch (error) {
      logger.error('❌ Failed to add reminder to queue:', error);
      throw error;
    }
  }

  async getReminder(jobId: string): Promise<Job<ReminderJobData, ReminderJobResult> | null> {
    try {
      return await this.queue.getJob(jobId);
    } catch (error) {
      logger.error(`❌ Failed to get reminder job ${jobId}:`, error);
      return null;
    }
  }

  async cancelReminder(jobId: string): Promise<boolean> {
    try {
      const job = await this.queue.getJob(jobId);
      if (job) {
        await job.remove();
        logger.info(`❌ Cancelled reminder job ${jobId}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`❌ Failed to cancel reminder job ${jobId}:`, error);
      return false;
    }
  }

  async getUserReminders(userId: string): Promise<Job<ReminderJobData, ReminderJobResult>[]> {
    try {
      const jobs = await this.queue.getJobs(['waiting', 'delayed', 'active']);
      return jobs.filter(job => job.data.userId === userId);
    } catch (error) {
      logger.error(`❌ Failed to get reminders for user ${userId}:`, error);
      return [];
    }
  }

  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.queue.getWaiting(),
        this.queue.getActive(),
        this.queue.getCompleted(),
        this.queue.getFailed(),
        this.queue.getDelayed(),
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
      };
    } catch (error) {
      logger.error('❌ Failed to get queue stats:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      await this.worker.close();
      await this.queue.close();
      logger.info('🔌 Reminder queue closed');
    } catch (error) {
      logger.error('❌ Error closing reminder queue:', error);
      throw error;
    }
  }
}
