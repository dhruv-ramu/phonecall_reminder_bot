import { Queue, Job } from 'bullmq';
import { RedisConnection } from '../queue/RedisConnection';
import { TwilioService } from '../twilio/TwilioService';
import { Config } from '../config/Config';
import { logger } from '../utils/logger';
import { ReminderJobData, ReminderJobResult } from '../types/ReminderTypes';

export class ReminderWorker {
  private queue: Queue<ReminderJobData, ReminderJobResult>;
  private redisConnection: RedisConnection;
  private twilioService: TwilioService;
  private config: Config;
  private isRunning = false;

  constructor(redisConnection: RedisConnection) {
    this.redisConnection = redisConnection;
    this.config = new Config();
    this.twilioService = new TwilioService(this.config);
    
    // Create queue instance for listening to completed jobs
    this.queue = new Queue<ReminderJobData, ReminderJobResult>('reminders', {
      connection: this.redisConnection.getClient(),
    });

    logger.info('✅ Reminder worker initialized');
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

      // Start listening for completed jobs
      this.startJobListener();
      
      this.isRunning = true;
      logger.info('🚀 Reminder worker started successfully');

      // Start periodic health checks
      this.startHealthChecks();

    } catch (error) {
      logger.error('❌ Failed to start reminder worker:', error);
      throw error;
    }
  }

  private startJobListener(): void {
    // Listen for completed jobs
    this.queue.on('completed', async (job: Job<ReminderJobData, ReminderJobResult>, result: ReminderJobResult) => {
      try {
        await this.processCompletedJob(job, result);
      } catch (error) {
        logger.error(`❌ Error processing completed job ${job.id}:`, error);
      }
    });

    // Listen for failed jobs
    this.queue.on('failed', async (job: Job<ReminderJobData, ReminderJobResult>, error: Error) => {
      logger.error(`❌ Job ${job.id} failed:`, error);
      
      // Attempt to retry the job if it's a reminder job
      if (job.name === 'reminder') {
        await this.handleFailedJob(job, error);
      }
    });

    logger.info('👂 Started listening for completed reminder jobs');
  }

  private async processCompletedJob(job: Job<ReminderJobData, ReminderJobResult>, result: ReminderJobResult): Promise<void> {
    const { message, userId, channelId, messageId, ttsVoice, audioFile } = job.data;
    
    logger.info(`🔔 Processing completed reminder job ${job.id}: "${message}"`);

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
        
        // Update the job result with call information
        result.callSid = callResult.callSid;
        result.message = `Reminder delivered via phone call. Call SID: ${callResult.callSid}`;
        
      } else {
        logger.error(`❌ Twilio call failed for reminder "${message}": ${callResult.error}`);
        
        // Mark the job as failed
        result.success = false;
        result.message = `Failed to make phone call: ${callResult.error}`;
        
        // Attempt to retry the call
        await this.scheduleRetry(job);
      }

    } catch (error) {
      logger.error(`❌ Error processing reminder job ${job.id}:`, error);
      
      result.success = false;
      result.message = `Error processing reminder: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      // Attempt to retry the call
      await this.scheduleRetry(job);
    }
  }

  private async handleFailedJob(job: Job<ReminderJobData, ReminderJobResult>, error: Error): Promise<void> {
    const { message, userId } = job.data;
    
    logger.warn(`⚠️ Handling failed reminder job ${job.id}: "${message}"`);
    
    // Check if we should retry based on the error type
    if (this.shouldRetry(error)) {
      await this.scheduleRetry(job);
    } else {
      logger.error(`❌ Job ${job.id} failed permanently: ${error.message}`);
      
      // Log the permanent failure for monitoring
      // In a production system, you might want to send alerts or notifications
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

  private startHealthChecks(): void {
    // Run health checks every 5 minutes
    setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('❌ Health check failed:', error);
      }
    }, 5 * 60 * 1000);

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
      
      // Close the queue connection
      await this.queue.close();
      
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
      await this.processCompletedJob(job, {
        success: true,
        messageId: jobId,
        timestamp: new Date().toISOString(),
        message: 'Force processed',
      });

      return true;
      
    } catch (error) {
      logger.error(`❌ Error force processing job ${jobId}:`, error);
      return false;
    }
  }
}
