const twilio = require('twilio');
require('dotenv').config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

console.log('🔧 Testing Twilio connection...');
console.log('📱 From:', process.env.TWILIO_PHONE_NUMBER);
console.log('📱 To:', process.env.TARGET_PHONE_NUMBER);

const twiml = `<?xml version='1.0' encoding='UTF-8'?>
<Response>
  <Say voice='alice'>This is a test call from your Discord Reminder Bot. If you can hear this, Twilio is working correctly!</Say>
  <Pause length='1'/>
  <Say voice='alice'>Test completed. Goodbye!</Say>
</Response>`;

client.calls.create({
  to: process.env.TARGET_PHONE_NUMBER,
  from: process.env.TWILIO_PHONE_NUMBER,
  twiml: twiml,
  timeout: 30
})
.then(call => {
  console.log('✅ Test call initiated successfully!');
  console.log('📞 Call SID:', call.sid);
  console.log('📞 Call Status:', call.status);
  console.log('📱 Your phone should ring in a few seconds...');
})
.catch(error => {
  console.error('❌ Test call failed:', error.message);
  console.error('🔍 Error details:', error);
});
