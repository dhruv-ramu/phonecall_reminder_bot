import { Queue, Job, Worker } from 'bullmq';
import { RedisConnection } from '../queue/RedisConnection';
import { ReminderQueue } from '../queue/ReminderQueue';
import { TwilioService } from '../twilio/TwilioService';
import { Config } from '../config/Config';
import { logger } from '../utils/logger';
import { ReminderJobData, ReminderJobResult } from '../types/ReminderTypes';

export class ReminderWorker {
  private queue: Queue<ReminderJobData, ReminderJobResult>;
  private worker: Worker<ReminderJobData, ReminderJobResult>;
  private redisConnection: RedisConnection;
  private twilioService: TwilioService;
  private config: Config;
  private isRunning = false;

  constructor(redisConnection: RedisConnection, reminderQueue: ReminderQueue) {
    this.redisConnection = redisConnection;
    this.config = new Config();
    this.twilioService = new TwilioService(this.config);
    
    // Get the queue instance from ReminderQueue
    this.queue = reminderQueue.getQueue();

    // Create worker to process jobs when they're due
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

    this.setupWorkerEventHandlers();
    logger.info('✅ Reminder worker initialized');
  }

  private setupWorkerEventHandlers(): void {
    // Worker events
    this.worker.on('error', (error) => {
      logger.error('❌ Worker error:', error);
    });

    this.worker.on('failed', (job, error) => {
      logger.error(`❌ Job ${job?.id} failed in worker:`, error);
      
      // Attempt to retry the job if it's a reminder job
      if (job && job.name === 'reminder') {
        this.handleFailedJob(job, error);
      }
    });

    this.worker.on('completed', (job) => {
      logger.info(`✅ Job ${job.id} completed successfully`);
    });

    logger.info('👂 Worker event handlers configured');
  }

  private async processReminderJob(job: Job<ReminderJobData, ReminderJobResult>): Promise<ReminderJobResult> {
    const { message, ttsVoice, audioFile } = job.data;
    
    logger.info(`🔔 Processing reminder job ${job.id}: "${message}"`);

    try {
      // Make the Twilio call
      let callResult;
      
      if (audioFile) {
        // Use audio file if specified
        callResult = await this.twilioService.makeCallWithAudio(
          audioFile,
          this.config.targetPhoneNumber,
          { loop: 2, volume: 1.0 }
        );
      } else {
        // Use TTS for the reminder message
        callResult = await this.twilioService.makeCallWithTTS(
          message,
          this.config.targetPhoneNumber,
          { 
            voice: ttsVoice || this.config.defaultTtsVoice,
            volume: 1.0,
            speed: 1.0
          }
        );
      }

      if (callResult.success) {
        logger.info(`✅ Twilio call successful for reminder "${message}". Call SID: ${callResult.callSid}`);
        
        const result: ReminderJobResult = {
          success: true,
          messageId: job.id as string,
          timestamp: new Date().toISOString(),
          message: `Reminder delivered via phone call. Call SID: ${callResult.callSid}`,
        };

        // Only add callSid if it exists
        if (callResult.callSid) {
          result.callSid = callResult.callSid;
        }

        return result;
        
      } else {
        logger.error(`❌ Twilio call failed for reminder "${message}": ${callResult.error}`);
        
        return {
          success: false,
          messageId: job.id as string,
          timestamp: new Date().toISOString(),
          message: `Failed to make phone call: ${callResult.error}`,
        };
      }

    } catch (error) {
      logger.error(`❌ Error processing reminder job ${job.id}:`, error);
      
      return {
        success: false,
        messageId: job.id as string,
        timestamp: new Date().toISOString(),
        message: `Error processing reminder: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async handleFailedJob(job: Job<ReminderJobData, ReminderJobResult>, error: Error): Promise<void> {
    const { message } = job.data;
    
    logger.warn(`⚠️ Handling failed reminder job ${job.id}: "${message}"`);
    
    // Check if we should retry based on the error type
    if (this.shouldRetry(error)) {
      await this.scheduleRetry(job);
    } else {
      logger.error(`❌ Job ${job.id} failed permanently: ${error.message}`);
    }
  }

  private shouldRetry(error: Error): boolean {
    const retryableErrors = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNREFUSED',
      'Network Error',
      'timeout',
      'rate limit',
      'quota exceeded',
    ];

    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(retryable => errorMessage.includes(retryable.toLowerCase()));
  }

  private async scheduleRetry(job: Job<ReminderJobData, ReminderJobResult>): Promise<void> {
    try {
      const retryDelay = Math.min(5 * 60 * 1000, job.opts.delay || 0); // 5 minutes or original delay
      
      // Add a retry job to the queue
      await this.queue.add(
        'reminder-retry',
        job.data,
        {
          delay: retryDelay,
          priority: (job.opts.priority || 0) + 1, // Higher priority for retries
          jobId: `retry-${job.id}-${Date.now()}`,
          attempts: 1, // Only retry once
        }
      );

      logger.info(`🔄 Scheduled retry for job ${job.id} in ${retryDelay / 1000} seconds`);
      
    } catch (error) {
      logger.error(`❌ Failed to schedule retry for job ${job.id}:`, error);
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('⚠️ Reminder worker is already running');
      return;
    }

    try {
      // Test Twilio connection
      const twilioConnected = await this.twilioService.testConnection();
      if (!twilioConnected) {
        throw new Error('Failed to connect to Twilio');
      }

      // Start the worker if it's not already running
      if (!this.worker.isRunning()) {
        await this.worker.run();
      }
      
      this.isRunning = true;
      logger.info('🚀 Reminder worker started successfully');

      // Start periodic health checks
      this.startHealthChecks();

    } catch (error) {
      logger.error('❌ Failed to start reminder worker:', error);
      throw error;
    }
  }

  private startHealthChecks(): void {
    // Run health checks every 5 minutes
    const healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('❌ Health check failed:', error);
      }
    }, 5 * 60 * 1000);

    // Store the interval ID for cleanup
    (this as any).healthCheckInterval = healthCheckInterval;

    logger.info('🏥 Started periodic health checks');
  }

  private async performHealthCheck(): Promise<void> {
    try {
      // Check Redis connection
      const redisHealthy = await this.redisConnection.healthCheck();
      if (!redisHealthy) {
        logger.warn('⚠️ Redis health check failed');
      }

      // Check Twilio connection
      const twilioHealthy = await this.twilioService.testConnection();
      if (!twilioHealthy) {
        logger.warn('⚠️ Twilio health check failed');
      }

      // Check queue health
      const queueStats = await this.queue.getJobCounts();
      logger.debug('📊 Queue health check:', queueStats);

      if (redisHealthy && twilioHealthy) {
        logger.debug('✅ Health check passed');
      }

    } catch (error) {
      logger.error('❌ Health check error:', error);
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('⚠️ Reminder worker is not running');
      return;
    }

    try {
      this.isRunning = false;
      
      // Clear health check interval
      if ((this as any).healthCheckInterval) {
        clearInterval((this as any).healthCheckInterval);
      }
      
      // Close the worker
      await this.worker.close();
      
      logger.info('🛑 Reminder worker stopped successfully');
      
    } catch (error) {
      logger.error('❌ Error stopping reminder worker:', error);
      throw error;
    }
  }

  /**
   * Get worker status
   */
  getStatus(): { isRunning: boolean; queueName: string } {
    return {
      isRunning: this.isRunning,
      queueName: this.queue.name,
    };
  }

  /**
   * Force process a specific job (useful for testing)
   */
  async forceProcessJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.queue.getJob(jobId);
      if (!job) {
        logger.warn(`⚠️ Job ${jobId} not found`);
        return false;
      }

      logger.info(`🔧 Force processing job ${jobId}`);
      const result = await this.processReminderJob(job);
      logger.info(`✅ Force processed job ${jobId} with result:`, result);

      return true;
      
    } catch (error) {
      logger.error(`❌ Error force processing job ${jobId}:`, error);
      return false;
    }
  }
}
