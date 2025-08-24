import twilio from 'twilio';
import { logger } from '../utils/logger';
import { Config } from '../config/Config';
import { TwilioCallOptions, TwilioCallResult } from '../types/ReminderTypes';

export class TwilioService {
  private client: twilio.Twilio;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    
    // Initialize Twilio client
    this.client = twilio(config.twilioAccountSid, config.twilioAuthToken);
    
    logger.info('✅ Twilio service initialized');
  }

  /**
   * Make an outbound voice call with TTS message
   */
  async makeCallWithTTS(
    message: string,
    targetPhone: string,
    options?: {
      voice?: string;
      language?: string;
      speed?: number;
      volume?: number;
    }
  ): Promise<TwilioCallResult> {
    try {
      const voice = options?.voice || this.config.defaultTtsVoice;
      const language = options?.language || 'en-US';
      const speed = options?.speed || 1.0;
      const volume = options?.volume || 1.0;

      // Generate TwiML for TTS
      const twiml = this.generateTTSResponse(message, voice, language, speed, volume);

      const callOptions: TwilioCallOptions = {
        to: targetPhone,
        from: this.config.twilioPhoneNumber,
        twiml: twiml,
        statusCallback: `${process.env.BASE_URL || 'http://localhost:3000'}/twilio/status`,
        timeout: 30, // 30 second timeout
      };

      logger.info(`📞 Making TTS call to ${targetPhone} with message: "${message}"`);

      const call = await this.client.calls.create(callOptions);

      logger.info(`✅ Call initiated successfully. Call SID: ${call.sid}`);

      return {
        success: true,
        callSid: call.sid,
        status: call.status,
      };

    } catch (error) {
      logger.error('❌ Failed to make TTS call:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Make an outbound voice call with audio file
   */
  async makeCallWithAudio(
    audioUrl: string,
    targetPhone: string,
    options?: {
      loop?: number;
      volume?: number;
    }
  ): Promise<TwilioCallResult> {
    try {
      const loop = options?.loop || 1;
      const volume = options?.volume || 1.0;

      // Generate TwiML for audio playback
      const twiml = this.generateAudioResponse(audioUrl, loop, volume);

      const callOptions: TwilioCallOptions = {
        to: targetPhone,
        from: this.config.twilioPhoneNumber,
        twiml: twiml,
        statusCallback: `${process.env.BASE_URL || 'http://localhost:3000'}/twilio/status`,
        timeout: 30,
      };

      logger.info(`📞 Making audio call to ${targetPhone} with audio: ${audioUrl}`);

      const call = await this.client.calls.create(callOptions);

      logger.info(`✅ Call initiated successfully. Call SID: ${call.sid}`);

      return {
        success: true,
        callSid: call.sid,
        status: call.status,
      };

    } catch (error) {
      logger.error('❌ Failed to make audio call:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Generate TwiML response for TTS
   */
  private generateTTSResponse(
    message: string,
    voice: string = 'alice',
    language: string = 'en-US',
    speed: number = 1.0,
    volume: number = 1.0
  ): string {
    // Sanitize the message for XML
    const sanitizedMessage = this.sanitizeMessage(message);
    
    // Create TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" language="${language}" speed="${speed}" volume="${volume}">
    ${sanitizedMessage}
  </Say>
  <Pause length="1"/>
  <Say voice="${voice}" language="${language}">
    This was your scheduled reminder. Goodbye!
  </Say>
</Response>`;

    return twiml;
  }

  /**
   * Generate TwiML response for audio playback
   */
  private generateAudioResponse(
    audioUrl: string,
    loop: number = 1,
    volume: number = 1.0
  ): string {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play loop="${loop}" volume="${volume}">${audioUrl}</Play>
  <Pause length="1"/>
  <Say voice="alice">
    This was your scheduled reminder. Goodbye!
  </Say>
</Response>`;

    return twiml;
  }

  /**
   * Sanitize message for XML safety
   */
  private sanitizeMessage(message: string): string {
    return message
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Get call details by SID
   */
  async getCallDetails(callSid: string): Promise<any> {
    try {
      const call = await this.client.calls(callSid).fetch();
      return call;
    } catch (error) {
      logger.error(`❌ Failed to get call details for ${callSid}:`, error);
      throw error;
    }
  }

  /**
   * Cancel an active call
   */
  async cancelCall(callSid: string): Promise<boolean> {
    try {
      await this.client.calls(callSid).update({ status: 'completed' });
      logger.info(`✅ Call ${callSid} cancelled successfully`);
      return true;
    } catch (error) {
      logger.error(`❌ Failed to cancel call ${callSid}:`, error);
      return false;
    }
  }

  /**
   * Get account usage statistics
   */
  async getAccountUsage(): Promise<any> {
    try {
      const usage = await this.client.usage.records.list({
        category: 'calls',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        endDate: new Date(),
      });

      return usage;
    } catch (error) {
      logger.error('❌ Failed to get account usage:', error);
      throw error;
    }
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    // International phone number validation (E.164 format)
    const phoneRegex = /^\+\d{1,3}\d{6,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  /**
   * Format phone number to E.164 format
   */
  formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // If it's already in E.164 format, return as is
    if (phoneNumber.startsWith('+')) {
      return phoneNumber;
    }
    
    // If it's a 10-digit number without country code, assume U.S. (+1)
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    
    // If it's an 11-digit number starting with 1, assume U.S.
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    
    // For other lengths, assume it's already properly formatted
    // or needs country code (user should specify)
    return phoneNumber.startsWith('+') ? phoneNumber : `+${digits}`;
  }

  /**
   * Test the Twilio connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to fetch account details
      const account = await this.client.api.accounts(this.config.twilioAccountSid).fetch();
      logger.info(`✅ Twilio connection test successful. Account: ${account.friendlyName}`);
      return true;
    } catch (error) {
      logger.error('❌ Twilio connection test failed:', error);
      return false;
    }
  }
}
