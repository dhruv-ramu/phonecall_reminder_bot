// Load environment variables
require('dotenv').config();

const { TwilioService } = require('./dist/twilio/TwilioService');
const { Config } = require('./dist/config/Config');

async function testReminderCall() {
  try {
    console.log('🧪 Testing Reminder Bot Call...');
    
    // Load configuration
    const config = new Config();
    console.log('✅ Configuration loaded');
    
    // Initialize Twilio service
    const twilioService = new TwilioService(config);
    console.log('✅ Twilio service initialized');
    
    // Your custom reminder message
    const message = "Hello this is your reminder bot with a test message sent by Dhruv";
    
    // Make the call
    console.log(`📞 Making call to ${config.targetPhoneNumber}...`);
    console.log(`💬 Message: "${message}"`);
    
    const result = await twilioService.makeCallWithTTS(
      message,
      config.targetPhoneNumber
    );
    
    if (result.success) {
      console.log('✅ Call initiated successfully!');
      console.log(`📱 Call SID: ${result.callSid || 'N/A'}`);
      console.log('🔔 You should receive a phone call shortly...');
    } else {
      console.log('❌ Call failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testReminderCall().catch(console.error);
