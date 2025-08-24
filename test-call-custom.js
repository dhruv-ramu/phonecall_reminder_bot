const { TwilioService } = require('./dist/twilio/TwilioService');
const { Config } = require('./dist/config/Config');
require('dotenv').config();

async function makeCustomCall() {
  console.log('📞 Making custom test call...');
  
  try {
    // Initialize configuration
    const config = new Config();
    console.log('✅ Configuration loaded');

    // Initialize Twilio service
    const twilioService = new TwilioService(config);
    console.log('✅ Twilio service initialized');

    // Test Twilio connection
    const twilioConnected = await twilioService.testConnection();
    if (!twilioConnected) {
      throw new Error('Failed to connect to Twilio');
    }
    console.log('✅ Twilio connection verified');

    // Make the call with custom TTS message
    const message = 'Greetings. This is quite interesting, isn\'t it?';
    const targetPhone = '';
    
    console.log(`📱 Calling: ${targetPhone}`);
    console.log(`💬 TTS Message: "${message}"`);
    
    const callResult = await twilioService.makeCallWithTTS(
      message,
      targetPhone,
      { 
        voice: 'alice',
        volume: 1.0,
        speed: 1.0
      }
    );

    if (callResult.success) {
      console.log('✅ Call initiated successfully!');
      console.log(`📞 Call SID: ${callResult.callSid}`);
      console.log(`📱 Your phone should ring in a few seconds...`);
      console.log(`💬 You will hear: "${message}"`);
    } else {
      console.error('❌ Call failed:', callResult.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
makeCustomCall().catch(console.error);
