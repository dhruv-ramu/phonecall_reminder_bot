# 📅 Google Calendar Integration Setup Guide

This guide will help you set up automatic phone call reminders for your Google Calendar events. The system will call you 10 minutes before each calendar event.

## 🎯 **How It Works**

1. **Automatic Sync**: Every 5 minutes, the bot checks your Google Calendar
2. **Event Detection**: Finds upcoming events in the next 24 hours
3. **Reminder Scheduling**: Automatically schedules phone calls 10 minutes before each event
4. **Phone Calls**: You receive a call with TTS message describing the upcoming event

## 🔧 **Prerequisites**

- Google account with Calendar access
- Google Cloud Project (free tier available)
- Service account with Calendar API access
- Node.js application with the calendar integration enabled

## 📋 **Step-by-Step Setup**

### **Step 1: Create Google Cloud Project**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: `discord-reminder-bot`
4. Click "Create"

### **Step 2: Enable Google Calendar API**

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google Calendar API"
3. Click on it and click "Enable"

### **Step 3: Create Service Account**

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Fill in details:
   - **Name**: `discord-reminder-bot`
   - **Description**: `Service account for Discord Reminder Bot calendar integration`
4. Click "Create and Continue"
5. Skip role assignment (click "Continue")
6. Click "Done"

### **Step 4: Generate Service Account Key**

1. Click on your service account email
2. Go to "Keys" tab
3. Click "Add Key" → "Create new key"
4. Choose "JSON" format
5. Click "Create"
6. **Download the JSON file** and save it securely

### **Step 5: Share Calendar with Service Account**

1. Open [Google Calendar](https://calendar.google.com/)
2. Find your calendar in the left sidebar
3. Click the three dots → "Settings and sharing"
4. Scroll to "Share with specific people"
5. Click "Add people"
6. Add your service account email (found in the JSON key file)
7. Set permission to "Make changes to events"
8. Click "Send"

### **Step 6: Configure Environment Variables**

1. Copy your downloaded JSON key file to your project
2. Update your `.env` file:

```env
# Google Calendar Integration
GOOGLE_CALENDAR_ENABLED=true
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./google-service-account-key.json
GOOGLE_CALENDAR_ID=primary
CALENDAR_SYNC_INTERVAL_MINUTES=5
CALENDAR_REMINDER_ADVANCE_MINUTES=10
CALENDAR_MAX_EVENTS_TO_PROCESS=50
```

### **Step 7: Install Dependencies**

```bash
npm install googleapis
```

### **Step 8: Restart Your Bot**

```bash
npm run build
npm start
```

## 🧪 **Testing the Integration**

### **Test 1: Check Calendar Status**

In Discord, use the command:
```
?calendar status
```

You should see:
- ✅ Connection: Connected
- 🔄 Sync Interval: Every 5 minutes
- ⏰ Reminder Advance: 10 minutes before events

### **Test 2: View Calendar Events**

```
?calendar events
```

This will show your upcoming calendar events.

### **Test 3: Manual Sync**

```
?calendar sync
```

This will manually trigger a calendar sync.

### **Test 4: Create a Test Event**

1. Add a test event to your Google Calendar
2. Set it for 15 minutes from now
3. Wait for the bot to sync (every 5 minutes)
4. You should receive a phone call 10 minutes before the event

## 📱 **What You'll Experience**

### **Phone Call Content**

When you receive a call, you'll hear:
> "Reminder: You have 'Meeting with Team' starting at 2:00 PM at Conference Room A. Discuss Q4 goals and project timeline. Attendees: john@company.com, sarah@company.com"

### **Call Timing**

- **10 minutes before**: Primary reminder call
- **Call duration**: ~20-30 seconds
- **Voice**: Alice (female TTS voice)

## ⚙️ **Configuration Options**

### **Sync Frequency**

```env
CALENDAR_SYNC_INTERVAL_MINUTES=5  # Check every 5 minutes
```

### **Reminder Timing**

```env
CALENDAR_REMINDER_ADVANCE_MINUTES=10  # 10 minutes before event
```

### **Event Processing**

```env
CALENDAR_MAX_EVENTS_TO_PROCESS=50  # Process up to 50 events per sync
```

## 🔒 **Security Considerations**

- **Service Account Key**: Keep your JSON key file secure
- **Calendar Permissions**: Only grant necessary permissions
- **Environment Variables**: Never commit keys to version control
- **Access Control**: Limit who can access your bot

## 🚨 **Troubleshooting**

### **Common Issues**

#### **"Failed to initialize Google Calendar service"**
- Check if the JSON key file path is correct
- Verify the file has proper permissions
- Ensure the service account has Calendar API access

#### **"Calendar connection failed"**
- Verify the service account email is added to your calendar
- Check if the Calendar API is enabled
- Ensure the JSON key file is valid

#### **"No events found"**
- Check if your calendar has upcoming events
- Verify the calendar ID is correct
- Ensure events are within the 24-hour window

#### **"Reminders not being scheduled"**
- Check if the reminder timing is in the future
- Verify the reminder queue is working
- Check logs for any errors

### **Debug Commands**

```bash
# Check logs
npm run dev

# Test calendar connection
node test-calendar.js

# Check reminder queue
?status
```

## 📊 **Monitoring & Logs**

### **Log Messages to Watch For**

- `🔄 Syncing Google Calendar events...`
- `📅 Found X upcoming events`
- `📅 Scheduled reminder for event "Event Name"`
- `✅ Calendar sync completed`

### **Health Checks**

The system automatically performs health checks:
- Calendar API connectivity
- Event processing status
- Reminder scheduling success

## 🎉 **Success Indicators**

You'll know it's working when:

1. ✅ Bot starts with "Google Calendar service started"
2. ✅ `?calendar status` shows "Connected"
3. ✅ `?calendar events` shows your upcoming events
4. ✅ You receive phone calls before calendar events
5. ✅ Logs show successful event processing

## 🔮 **Future Enhancements**

- **Multiple reminder times**: 30 min, 1 hour, 1 day before
- **Custom TTS voices**: Choose different voices for different event types
- **Event filtering**: Only remind for specific calendar types
- **Recurring event handling**: Smart reminders for recurring meetings
- **Calendar webhooks**: Real-time event updates

## 📞 **Support**

If you encounter issues:

1. Check the logs for error messages
2. Verify all configuration steps
3. Test with a simple calendar event
4. Ensure your phone number is verified in Twilio

---

**Your Discord Reminder Bot is now a powerful calendar assistant that will never let you miss another meeting!** 🎯📅📱
