const { google } = require('googleapis');
require('dotenv').config();

async function debugCalendarAccess() {
  console.log('🔍 Debugging Google Calendar Access...');
  
  try {
    // Check environment variables
    console.log('\n📋 Environment Variables:');
    console.log('GOOGLE_CALENDAR_ENABLED:', process.env.GOOGLE_CALENDAR_ENABLED);
    console.log('GOOGLE_SERVICE_ACCOUNT_KEY_PATH:', process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH);
    console.log('GOOGLE_CALENDAR_ID:', process.env.GOOGLE_CALENDAR_ID);
    
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH) {
      console.log('❌ GOOGLE_SERVICE_ACCOUNT_KEY_PATH not set');
      return;
    }

    // Initialize Google Auth
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    });

    // Initialize Calendar API
    const calendar = google.calendar({ version: 'v3', auth });
    
    console.log('\n🔗 Testing authentication...');
    
    // Test 1: List all accessible calendars
    console.log('\n📅 Listing accessible calendars...');
    try {
      const calendarList = await calendar.calendarList.list();
      console.log(`✅ Found ${calendarList.data.items?.length || 0} calendars:`);
      
      if (calendarList.data.items) {
        calendarList.data.items.forEach((cal, index) => {
          console.log(`  ${index + 1}. ${cal.summary} (${cal.id})`);
          console.log(`     Access Role: ${cal.accessRole}`);
          console.log(`     Primary: ${cal.primary ? 'Yes' : 'No'}`);
          console.log('');
        });
      }
    } catch (error) {
      console.log('❌ Failed to list calendars:', error.message);
    }

    // Test 2: Try to access your calendar directly
    console.log('\n🎯 Testing your calendar access...');
    try {
      const yourCalendar = await calendar.calendars.get({
        calendarId: process.env.GOOGLE_CALENDAR_ID
      });
      console.log('✅ Your calendar accessible:', yourCalendar.data.summary);
    } catch (error) {
      console.log('❌ Your calendar not accessible:', error.message);
    }

    // Test 3: Try to list events from your calendar
    console.log('\n📋 Testing event listing from your calendar...');
    try {
      const now = new Date();
      const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next 24 hours
      
      const events = await calendar.events.list({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        timeMin: now.toISOString(),
        timeMax: endTime.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 10,
      });
      
      console.log(`✅ Found ${events.data.items?.length || 0} events in your calendar:`);
      
      if (events.data.items && events.data.items.length > 0) {
        events.data.items.forEach((event, index) => {
          console.log(`  ${index + 1}. ${event.summary || 'No Title'}`);
          if (event.start?.dateTime) {
            console.log(`     Start: ${event.start.dateTime}`);
          }
          if (event.location) {
            console.log(`     Location: ${event.location}`);
          }
          console.log('');
        });
      } else {
        console.log('ℹ️ No events found in the next 24 hours');
      }
    } catch (error) {
      console.log('❌ Failed to list events:', error.message);
    }

    // Test 4: Check service account details
    console.log('\n👤 Service Account Details:');
    try {
      const authClient = await auth.getClient();
      const projectId = await auth.getProjectId();
      console.log('✅ Project ID:', projectId);
      
      // Get service account email from the key file
      const fs = require('fs');
      const keyData = JSON.parse(fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH, 'utf8'));
      console.log('✅ Service Account Email:', keyData.client_email);
      console.log('✅ Service Account ID:', keyData.client_id);
      
    } catch (error) {
      console.log('❌ Failed to get service account details:', error.message);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
debugCalendarAccess().catch(console.error);
