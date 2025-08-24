# Discord and Google Calendar Phone Call Reminder Bot
*NEVER MISS AN IMPORTANT EVENT AGAIN*.

A powerful bot that schedules reminders and automatically makes phone calls using Twilio. Now with **Google Calendar integration** for automatic event reminders!
## ✨ Features

### 🎯 Core Reminder System
- **Smart Time Parsing**: Supports multiple time formats (relative, absolute, natural language)
- **Voice Call Reminders**: Uses Twilio to make actual phone calls with Text-to-Speech
- **Queue Management**: Robust job queue system with Redis and BullMQ
- **Discord Integration**: Easy-to-use commands with rich embeds and error handling

### 📅 Google Calendar Integration
- **Automatic Event Detection**: Monitors your Google Calendar for upcoming events
- **Smart Reminder Scheduling**: Automatically schedules phone calls 10 minutes before events
- **Real-time Sync**: Syncs every 5 minutes to catch new events
- **Service Account Security**: Secure authentication using Google Cloud service accounts

### 🎨 Advanced Features
- **Multiple TTS Voices**: Choose from various Twilio TTS voices
- **Flexible Time Formats**: 
  - Relative: `30s`, `5m`, `2h`, `1d`, `1w`
  - Absolute: `9:00am`, `14:30`
  - Date/Time: `12/25/2024 9:00am`
  - Natural: `tomorrow 9am`, `next monday`
- **Comprehensive Logging**
- **TypeScript**

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Redis server
- Discord Bot Token
- Twilio Account
- Google Cloud Project (for calendar integration)

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd reminders
npm install
```

### 2. Environment Setup
```bash
cp env.example .env
# Edit .env with your configuration
```

### 3. Build & Run
```bash
npm run build
npm start
```

## ⚙️ Configuration

### Required Environment Variables
```env
# Discord Bot
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id

# Twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER_your_twilio_phone

# Target Phone
TARGET_PHONE_NUMBER=your_phone

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Optional Google Calendar Integration
```env
GOOGLE_CALENDAR_ENABLED=true
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=google-service-account-key.json
GOOGLE_CALENDAR_ID=your-email@gmail.com
CALENDAR_SYNC_INTERVAL_MINUTES=5
CALENDAR_REMINDER_ADVANCE_MINUTES=10
```

## 📱 Discord Commands

### Basic Reminders
```
?remind Take medicine -t 30m
?remind Call mom -t 2h
?remind Team meeting -t 9:00am
?remind Dentist appointment -t 12/25/2024 2:00pm
```

### Calendar Integration
```
?calendar events          # View upcoming events
?calendar sync            # Manual calendar sync
?calendar status          # Calendar service status
```

### Management
```
?list                     # List your active reminders
?cancel <reminder_id>     # Cancel a reminder
?status                   # Bot and queue status
?help                     # Show all commands
```

## 🧪 Testing & Development

### Test Scripts
- **`test-call.js`**: Basic Twilio call test
- **`test-reminder.js`**: End-to-end reminder flow test
- **`test-calendar.js`**: Google Calendar integration test
- **`debug-calendar.js`**: Calendar access debugging
- **`test-reminder-call.js`**: Custom reminder call test

### Development Commands
```bash
npm run dev          # Development mode with auto-reload
npm run build        # Build TypeScript
npm run test         # Run tests
npm run lint         # Lint code
npm run type-check   # Type checking
```

## 🏗️ Architecture

### Core Components
```
src/
├── bot/              # Discord bot implementation
├── calendar/          # Google Calendar service
├── config/           # Configuration management
├── queue/            # Redis queue management
├── twilio/           # Twilio voice service
├── types/            # TypeScript interfaces
├── utils/            # Utility functions
├── worker/           # Background job processor
└── index.ts          # Application entry point
```

### Data Flow
1. **Discord Command** → **Time Parser** → **Reminder Queue**
2. **Queue Scheduler** → **Reminder Worker** → **Twilio Service**
3. **Google Calendar** → **Event Sync** → **Automatic Reminders**

### Technology Stack
- **Runtime**: Node.js + TypeScript
- **Discord**: discord.js v14
- **Queue**: BullMQ + Redis
- **Voice**: Twilio Programmable Voice
- **Calendar**: Google Calendar API
- **Validation**: Zod schemas
- **Logging**: Winston
- **Testing**: Jest

## 📚 Documentation

- **[Google Calendar Setup](docs/google-calendar-setup.md)**: Complete setup guide
- **[Deployment Guide](docs/deployment.md)**: Production deployment instructions
- **[Project Overview](docs/project-overview.md)**: Detailed technical overview

## 🔧 Advanced Configuration

### TTS Voice Options
```typescript
// Available voices: alice, polly, google, etc.
DEFAULT_TTS_VOICE=alice
```

### Calendar Sync Settings
```env
CALENDAR_SYNC_INTERVAL_MINUTES=5      # How often to sync
CALENDAR_REMINDER_ADVANCE_MINUTES=10  # Minutes before event
CALENDAR_MAX_EVENTS_TO_PROCESS=50     # Max events per sync
```

### Redis Configuration
```env
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

## 🚀 Deployment

### Production Build
```bash
npm run build
NODE_ENV=production npm start
```

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["npm", "start"]
```

### Environment Management
- Use `.env` for local development
- Set environment variables in production
- Consider using a secrets manager for sensitive data

## 🧪 Testing Your Setup

### 1. Test Basic Call
```bash
node test-call.js
```

### 2. Test Reminder Flow
```bash
node test-reminder.js
```

### 3. Test Calendar Integration
```bash
node test-calendar.js
```

### 4. Debug Calendar Access
```bash
node debug-calendar.js
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues
- **Calendar not syncing**: Check service account permissions
- **Calls not working**: Verify Twilio credentials and phone numbers
- **Redis connection**: Ensure Redis server is running

### Getting Help
- Check the [documentation](docs/)
- Review [deployment guide](docs/deployment.md)
- Open an issue with detailed error information

---

**🎉 Your Discord Reminder Bot is now ready to never let you miss another important event!**