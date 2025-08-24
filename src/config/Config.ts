import { z } from 'zod';

const ConfigSchema = z.object({
  // Discord Configuration
  discordToken: z.string().min(1, 'Discord token is required'),
  discordClientId: z.string().min(1, 'Discord client ID is required'),
  discordGuildId: z.string().optional(),

  // Twilio Configuration
  twilioAccountSid: z.string().min(1, 'Twilio account SID is required'),
  twilioAuthToken: z.string().min(1, 'Twilio auth token is required'),
  twilioPhoneNumber: z.string().regex(/^\+1\d{10}$/, 'Invalid Twilio phone number format'),

  // Target Phone Number
  targetPhoneNumber: z.string().regex(/^\+\d{1,3}\d{6,14}$/, 'Invalid international phone number format'),

  // Redis Configuration
  redisUrl: z.string().optional(),
  redisHost: z.string().default('localhost'),
  redisPort: z.number().default(6379),
  redisPassword: z.string().optional(),
  redisDb: z.number().default(0),

  // Application Configuration
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  port: z.number().default(3000),

  // Reminder Configuration
  defaultTtsVoice: z.string().default('alice'),
  defaultCallDuration: z.number().min(10).max(60).default(20),
  maxRemindersPerUser: z.number().min(1).max(1000).default(50),
  maxReminderDelayDays: z.number().min(1).max(365).default(30),
});

export type ConfigType = z.infer<typeof ConfigSchema>;

export class Config {
  private config: ConfigType;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): ConfigType {
    const envConfig = {
      discordToken: process.env.DISCORD_TOKEN,
      discordClientId: process.env.DISCORD_CLIENT_ID,
      discordGuildId: process.env.DISCORD_GUILD_ID,

      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
      twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,

      targetPhoneNumber: process.env.TARGET_PHONE_NUMBER,

      redisUrl: process.env.REDIS_URL,
      redisHost: process.env.REDIS_HOST,
      redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
      redisPassword: process.env.REDIS_PASSWORD,
      redisDb: parseInt(process.env.REDIS_DB || '0', 10),

      nodeEnv: process.env.NODE_ENV as 'development' | 'production' | 'test',
      logLevel: process.env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug',
      port: parseInt(process.env.PORT || '3000', 10),

      defaultTtsVoice: process.env.DEFAULT_TTS_VOICE,
      defaultCallDuration: parseInt(process.env.DEFAULT_CALL_DURATION || '20', 10),
      maxRemindersPerUser: parseInt(process.env.MAX_REMINDERS_PER_USER || '50', 10),
      maxReminderDelayDays: parseInt(process.env.MAX_REMINDER_DELAY_DAYS || '30', 10),
    };

    try {
      return ConfigSchema.parse(envConfig);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const missingFields = error.errors.map(err => err.path.join('.')).join(', ');
        throw new Error(`Configuration validation failed. Missing or invalid fields: ${missingFields}`);
      }
      throw error;
    }
  }

  // Getters for all configuration values
  get discordToken(): string { return this.config.discordToken; }
  get discordClientId(): string { return this.config.discordClientId; }
  get discordGuildId(): string | undefined { return this.config.discordGuildId; }
  
  get twilioAccountSid(): string { return this.config.twilioAccountSid; }
  get twilioAuthToken(): string { return this.config.twilioAuthToken; }
  get twilioPhoneNumber(): string { return this.config.twilioPhoneNumber; }
  
  get targetPhoneNumber(): string { return this.config.targetPhoneNumber; }
  
  get redisUrl(): string | undefined { return this.config.redisUrl; }
  get redisHost(): string { return this.config.redisHost; }
  get redisPort(): number { return this.config.redisPort; }
  get redisPassword(): string | undefined { return this.config.redisPassword; }
  get redisDb(): number { return this.config.redisDb; }
  
  get nodeEnv(): string { return this.config.nodeEnv; }
  get logLevel(): string { return this.config.logLevel; }
  get port(): number { return this.config.port; }
  
  get defaultTtsVoice(): string { return this.config.defaultTtsVoice; }
  get defaultCallDuration(): number { return this.config.defaultCallDuration; }
  get maxRemindersPerUser(): number { return this.config.maxRemindersPerUser; }
  get maxReminderDelayDays(): number { return this.config.maxReminderDelayDays; }

  // Helper methods
  get isDevelopment(): boolean { return this.config.nodeEnv === 'development'; }
  get isProduction(): boolean { return this.config.nodeEnv === 'production'; }
  get isTest(): boolean { return this.config.nodeEnv === 'test'; }

  // Get Redis connection options
  getRedisOptions() {
    if (this.config.redisUrl) {
      return { url: this.config.redisUrl };
    }

    return {
      host: this.config.redisHost,
      port: this.config.redisPort,
      password: this.config.redisPassword,
      db: this.config.redisDb,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    };
  }
}
