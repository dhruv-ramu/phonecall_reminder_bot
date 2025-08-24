import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { Config } from '../config/Config';

export class RedisConnection {
  private redis: Redis | null = null;
  private config: Config;

  constructor() {
    this.config = new Config();
  }

  async connect(): Promise<void> {
    try {
      const options = this.config.getRedisOptions();
      
      this.redis = new Redis(options);
      
      // Handle connection events
      this.redis.on('connect', () => {
        logger.info('🔗 Redis connected');
      });

      this.redis.on('ready', () => {
        logger.info('✅ Redis ready');
      });

      this.redis.on('error', (error) => {
        logger.error('❌ Redis error:', error);
      });

      this.redis.on('close', () => {
        logger.warn('⚠️ Redis connection closed');
      });

      this.redis.on('reconnecting', () => {
        logger.info('🔄 Redis reconnecting...');
      });

      // Test the connection
      await this.redis.ping();
      logger.info('🏓 Redis ping successful');
      
    } catch (error) {
      logger.error('❌ Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.quit();
        this.redis = null;
        logger.info('🔌 Redis disconnected');
      } catch (error) {
        logger.error('❌ Error disconnecting from Redis:', error);
        throw error;
      }
    }
  }

  getClient(): Redis {
    if (!this.redis) {
      throw new Error('Redis not connected. Call connect() first.');
    }
    return this.redis;
  }

  async healthCheck(): Promise<boolean> {
    if (!this.redis) {
      return false;
    }

    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('❌ Redis health check failed:', error);
      return false;
    }
  }

  async getInfo(): Promise<Record<string, any>> {
    if (!this.redis) {
      throw new Error('Redis not connected');
    }

    try {
      const info = await this.redis.info();
      const lines = info.split('\r\n');
      const result: Record<string, any> = {};

      for (const line of lines) {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          result[key] = value;
        }
      }

      return result;
    } catch (error) {
      logger.error('❌ Failed to get Redis info:', error);
      throw error;
    }
  }

  async getMemoryUsage(): Promise<number> {
    if (!this.redis) {
      throw new Error('Redis not connected');
    }

    try {
      const info = await this.redis.info('memory');
      const usedMemoryMatch = info.match(/used_memory:(\d+)/);
      return usedMemoryMatch ? parseInt(usedMemoryMatch[1], 10) : 0;
    } catch (error) {
      logger.error('❌ Failed to get Redis memory usage:', error);
      throw error;
    }
  }

  async flushDb(): Promise<void> {
    if (!this.redis) {
      throw new Error('Redis not connected');
    }

    try {
      await this.redis.flushdb();
      logger.info('🧹 Redis database flushed');
    } catch (error) {
      logger.error('❌ Failed to flush Redis database:', error);
      throw error;
    }
  }
}
