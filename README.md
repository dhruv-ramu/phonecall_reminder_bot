# 📌 Discord Reminder Bot with Twilio Voice Calls

A Discord bot that schedules reminders and triggers outbound Twilio voice calls to your U.S. phone number at the specified time. Perfect for bypassing iOS notification limitations with guaranteed audible alerts.

## 🎯 Features

- **Discord Commands**: `?remind <message> -t <delay>` syntax
- **Flexible Timing**: Relative delays (`6h`, `45m`) or absolute timestamps
- **Voice Calls**: Twilio outbound calls that ring your phone and play TTS reminders
- **Reliable Scheduling**: Redis-backed job queue with persistence
- **Customizable**: TTS voice selection, audio file playback options
- **Scalable**: Handles multiple concurrent reminders

## 🏗️ Architecture

```
Discord Bot → Redis Queue → Worker → Twilio API → Your Phone
```

### Components
1. **Discord Bot** (`discord.js`) - Command parsing and job creation
2. **Job Queue** (`BullMQ + Redis`) - Persistent task scheduling
3. **Worker Service** - Executes scheduled reminders via Twilio
4. **Twilio Voice API** - Places outbound calls with TTS/audio

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Redis instance
- Discord Bot Token
- Twilio Account with U.S. phone number

### Installation
```bash
# Clone and install dependencies
git clone <your-repo>
cd reminders
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Start the services
npm run dev
```

### Environment Variables
```env
# Discord
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_client_id

# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+14152223333

# Redis
REDIS_URL=redis://localhost:6379

# Your phone number
TARGET_PHONE_NUMBER=+14155550123
```

## 📱 Usage Examples

```
?remind Attend meeting! -t 6h
?remind Call mom -t 2h30m
?remind Daily standup -t 9am
?remind Project deadline -t 1640995200
```

## 💰 Cost Estimate

- **Twilio U.S. number**: $1/month
- **Outbound calls**: ~$0.02/minute
- **Typical usage (30 reminders/month)**: ~$1.60/month

## 🔧 Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production services
npm start
```

## 📁 Project Structure

```
reminders/
├── src/
│   ├── bot/           # Discord bot logic
│   ├── commands/      # Command handlers
│   ├── queue/         # Redis job queue
│   ├── worker/        # Reminder execution
│   ├── twilio/        # Twilio API integration
│   └── utils/         # Helper functions
├── config/            # Configuration files
├── docs/              # Documentation
└── tests/             # Test suite
```

## 🧪 Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## 📚 Documentation

- [API Reference](./docs/api.md)
- [Deployment Guide](./docs/deployment.md)
- [Contributing](./docs/contributing.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details
