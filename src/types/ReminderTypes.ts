// Reminder job data structure
export interface ReminderJobData {
  message: string;           // The reminder message
  userId: string;            // Discord user ID who set the reminder
  channelId: string;         // Discord channel ID where reminder was set
  messageId: string;         // Discord message ID that triggered the reminder
  ttsVoice?: string;         // TTS voice to use (default: 'alice')
  audioFile?: string;        // Optional audio file URL to play instead of TTS
  priority?: number;         // Job priority (higher = more important)
  createdAt: string;         // ISO timestamp when reminder was created
}

// Reminder job result
export interface ReminderJobResult {
  success: boolean;          // Whether the reminder was processed successfully
  messageId: string;         // Job ID for tracking
  timestamp: string;         // ISO timestamp when processed
  message: string;           // Result message or error description
  callSid?: string;         // Twilio call SID if call was made
}

// Reminder command parsing result
export interface ParsedReminderCommand {
  message: string;           // The reminder message
  delayMs: number;           // Delay in milliseconds
  timestamp: Date;           // Absolute timestamp when reminder should fire
  isValid: boolean;          // Whether the command is valid
  error?: string;            // Error message if invalid
}

// Twilio call options
export interface TwilioCallOptions {
  to: string;                // Target phone number
  from: string;              // Twilio phone number
  twiml: string;             // TwiML instructions
  statusCallback?: string;   // Optional webhook for call status updates
  timeout?: number;          // Call timeout in seconds
}

// Twilio call result
export interface TwilioCallResult {
  success: boolean;          // Whether the call was initiated successfully
  callSid?: string;         // Twilio call SID
  error?: string;            // Error message if failed
  status?: string;           // Call status
}

// User reminder statistics
export interface UserReminderStats {
  userId: string;            // Discord user ID
  totalReminders: number;    // Total reminders set
  activeReminders: number;   // Currently active reminders
  completedReminders: number; // Completed reminders
  cancelledReminders: number; // Cancelled reminders
}

// Queue statistics
export interface QueueStats {
  waiting: number;           // Jobs waiting to be processed
  active: number;            // Currently processing jobs
  completed: number;         // Successfully completed jobs
  failed: number;            // Failed jobs
  delayed: number;           // Delayed jobs
  total: number;             // Total jobs in queue
}

// Reminder validation result
export interface ReminderValidation {
  isValid: boolean;          // Whether the reminder is valid
  errors: string[];          // List of validation errors
  warnings: string[];        // List of validation warnings
}

// Time parsing result
export interface TimeParseResult {
  isValid: boolean;          // Whether the time string is valid
  delayMs: number;           // Delay in milliseconds
  timestamp: Date;           // Absolute timestamp
  error?: string;            // Error message if invalid
  originalInput: string;     // Original time input string
}

// Discord command context
export interface DiscordCommandContext {
  userId: string;            // Discord user ID
  username: string;          // Discord username
  channelId: string;         // Channel ID where command was issued
  messageId: string;         // Message ID that triggered the command
  guildId?: string;          // Guild/Server ID (if applicable)
  isDM: boolean;             // Whether command was sent in DM
}

// Reminder execution context
export interface ReminderExecutionContext {
  jobId: string;             // BullMQ job ID
  reminderData: ReminderJobData; // Original reminder data
  executionTime: Date;       // When the reminder was executed
  retryCount: number;        // Current retry attempt
  maxRetries: number;        // Maximum retry attempts
}
