import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Mock external services
jest.mock('discord.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    login: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    user: {
      setActivity: jest.fn(),
      tag: 'TestBot#1234',
    },
  })),
  GatewayIntentBits: {
    Guilds: 1,
    GuildMessages: 2,
    MessageContent: 4,
    DirectMessages: 8,
  },
  Events: {
    ClientReady: 'ready',
    MessageCreate: 'messageCreate',
    Error: 'error',
    Warn: 'warn',
  },
}));

jest.mock('twilio', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    calls: {
      create: jest.fn().mockResolvedValue({
        sid: 'test-call-sid',
        status: 'initiated',
      }),
    },
    api: {
      accounts: jest.fn().mockReturnValue({
        fetch: jest.fn().mockResolvedValue({
          friendlyName: 'Test Account',
        }),
      }),
    },
  })),
}));

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    ping: jest.fn().mockResolvedValue('PONG'),
    quit: jest.fn().mockResolvedValue('OK'),
    info: jest.fn().mockResolvedValue('redis_version:6.0.0'),
  })),
}));

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'test-job-id' }),
    getJob: jest.fn().mockResolvedValue(null),
    getJobs: jest.fn().mockResolvedValue([]),
    getJobCounts: jest.fn().mockResolvedValue({
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    }),
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  })),
  QueueScheduler: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Global test utilities
declare global {
  var testUtils: {
    createMockMessage: (content: string, authorId?: string) => any;
    createMockConfig: () => any;
  };
}

global.testUtils = {
  createMockMessage: (content: string, authorId: string = '123456789') => ({
    content,
    author: {
      id: authorId,
      username: 'testuser',
      bot: false,
    },
    channel: {
      id: 'channel123',
      send: jest.fn().mockResolvedValue(undefined),
    },
    id: 'message123',
    guild: {
      id: 'guild123',
    },
  }),
  
  createMockConfig: () => ({
    discordToken: 'test-token',
    discordClientId: 'test-client-id',
    twilioAccountSid: 'test-account-sid',
    twilioAuthToken: 'test-auth-token',
    twilioPhoneNumber: '+14152223333',
    targetPhoneNumber: '+14155550123',
    redisUrl: 'redis://localhost:6379',
    nodeEnv: 'test',
    logLevel: 'error',
    defaultTtsVoice: 'alice',
    defaultCallDuration: 20,
    maxRemindersPerUser: 50,
    maxReminderDelayDays: 30,
  }),
};

// Test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
