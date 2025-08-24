const { GoogleCalendarService } = require('./dist/calendar/GoogleCalendarService');
const { ReminderQueue } = require('./dist/queue/ReminderQueue');
const { RedisConnection } = require('./dist/queue/RedisConnection');
const { Config } = require('./dist/config/Config');
require('dotenv').config();

async function testCalendarIntegration() {
  console.log('🧪 Testing Google Calendar Integration...');
  
  try {
    // Initialize configuration
    const config = new Config();
    console.log('✅ Configuration loaded');

    // Check if calendar integration is enabled
    if (!config.googleCalendarEnabled) {
      console.log('ℹ️ Google Calendar integration is disabled in config');
      console.log('💡 Enable it by setting GOOGLE_CALENDAR_ENABLED=true in your .env file');
      return;
    }

    // Check if service account key path is set
    if (!config.googleServiceAccountKeyPath) {
      console.log('❌ GOOGLE_SERVICE_ACCOUNT_KEY_PATH is not set');
      console.log('💡 Download your service account key from Google Cloud Console');
      return;
    }

    // Initialize Redis connection
    const redisConnection = new RedisConnection(config);
    await redisConnection.connect();
    console.log('✅ Redis connected');

    // Initialize reminder queue
    const reminderQueue = new ReminderQueue(redisConnection);
    console.log('✅ Reminder queue initialized');
    
    // Initialize Google Calendar service
    const calendarService = new GoogleCalendarService(config, reminderQueue);
    console.log('✅ Google Calendar service initialized');

    // Test calendar connection
    console.log('\n🔗 Testing Google Calendar connection...');
    const connected = await calendarService.testConnection();
    
    if (connected) {
      console.log('✅ Google Calendar connection successful!');
      
      // Get upcoming events
      console.log('\n📅 Fetching upcoming events...');
      const events = await calendarService.getUpcomingEvents(24); // Next 24 hours
      
      console.log(`📊 Found ${events.length} upcoming events:`);
      
      if (events.length > 0) {
        events.slice(0, 5).forEach((event, index) => {
          const timeUntil = Math.floor((event.startTime.getTime() - Date.now()) / (1000 * 60));
          console.log(`  ${index + 1}. ${event.summary}`);
          console.log(`     ⏰ ${event.startTime.toLocaleString()} (in ${timeUntil} minutes)`);
          if (event.location) {
            console.log(`     📍 ${event.location}`);
          }
          if (event.attendees.length > 0) {
            console.log(`     👥 ${event.attendees.length} attendees`);
          }
          console.log('');
        });
        
        if (events.length > 5) {
          console.log(`     ... and ${events.length - 5} more events`);
        }
      } else {
        console.log('ℹ️ No upcoming events found in the next 24 hours');
        console.log('💡 Try adding a test event to your Google Calendar');
      }

      // Start the calendar service
      console.log('\n🚀 Starting calendar service...');
      await calendarService.start();
      console.log('✅ Calendar service started successfully');
      
      // Wait a bit to see sync in action
      console.log('\n⏳ Waiting 10 seconds to observe calendar sync...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Stop the service
      await calendarService.stop();
      console.log('✅ Calendar service stopped');
      
    } else {
      console.log('❌ Google Calendar connection failed');
      console.log('💡 Check your service account key and calendar permissions');
    }

    // Cleanup
    await redisConnection.disconnect();
    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (error.message.includes('ENOENT')) {
      console.log('\n💡 Service account key file not found. Make sure to:');
      console.log('   1. Download your service account key from Google Cloud Console');
      console.log('   2. Place it in your project directory');
      console.log('   3. Update GOOGLE_SERVICE_ACCOUNT_KEY_PATH in your .env file');
    } else if (error.message.includes('invalid_grant')) {
      console.log('\n💡 Authentication failed. Make sure to:');
      console.log('   1. Share your calendar with the service account email');
      console.log('   2. Grant "Make changes to events" permission');
    } else if (error.message.includes('API not enabled')) {
      console.log('\n💡 Google Calendar API not enabled. Make sure to:');
      console.log('   1. Enable Google Calendar API in your Google Cloud project');
      console.log('   2. Create a service account with proper permissions');
    }
    
    process.exit(1);
  }
}

// Run the test
testCalendarIntegration().catch(console.error);
