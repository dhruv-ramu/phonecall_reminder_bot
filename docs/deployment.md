# 🚀 Deployment Guide

This guide covers deploying your Discord Reminder Bot to various hosting platforms.

## 📋 Prerequisites

Before deploying, ensure you have:

1. **Discord Bot Token** - From [Discord Developer Portal](https://discord.com/developers/applications)
2. **Twilio Account** - With verified U.S. phone number
3. **Redis Instance** - For job queue persistence
4. **Environment Variables** - Properly configured

## 🏠 Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

```bash
cp env.example .env
# Edit .env with your credentials
```

### 3. Start Redis

```bash
# macOS (using Homebrew)
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis-server

# Windows (using WSL or Docker)
docker run -d -p 6379:6379 redis:alpine
```

### 4. Run the Bot

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm run build
npm start
```

## ☁️ Cloud Deployment

### Option 1: Railway (Recommended for Beginners)

Railway offers a simple deployment process with built-in Redis support.

#### 1. Create Railway Account
- Visit [railway.app](https://railway.app)
- Sign up with GitHub

#### 2. Deploy from GitHub
```bash
# Push your code to GitHub
git add .
git commit -m "Initial commit"
git push origin main

# In Railway dashboard:
# 1. Click "New Project"
# 2. Select "Deploy from GitHub repo"
# 3. Choose your repository
```

#### 3. Add Redis Service
- In your project, click "New Service"
- Select "Redis"
- Railway will automatically provide `REDIS_URL`

#### 4. Configure Environment Variables
In Railway dashboard, add these variables:
```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_client_id
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+14152223333
TARGET_PHONE_NUMBER=+14155550123
NODE_ENV=production
```

#### 5. Deploy
- Railway will automatically build and deploy your app
- Check the logs for any errors

### Option 2: Fly.io

Fly.io offers global deployment with generous free tier.

#### 1. Install Fly CLI
```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh
```

#### 2. Login and Create App
```bash
fly auth login
fly launch
```

#### 3. Add Redis
```bash
fly redis create
fly redis attach <redis-app-name>
```

#### 4. Deploy
```bash
fly deploy
```

### Option 3: Heroku

#### 1. Install Heroku CLI
```bash
# macOS
brew install heroku/brew/heroku

# Other platforms: https://devcenter.heroku.com/articles/heroku-cli
```

#### 2. Create Heroku App
```bash
heroku create your-bot-name
```

#### 3. Add Redis Add-on
```bash
heroku addons:create heroku-redis:hobby-dev
```

#### 4. Set Environment Variables
```bash
heroku config:set DISCORD_TOKEN=your_token
heroku config:set DISCORD_CLIENT_ID=your_client_id
heroku config:set TWILIO_ACCOUNT_SID=your_account_sid
heroku config:set TWILIO_AUTH_TOKEN=your_auth_token
heroku config:set TWILIO_PHONE_NUMBER=+14152223333
heroku config:set TARGET_PHONE_NUMBER=+14155550123
heroku config:set NODE_ENV=production
```

#### 5. Deploy
```bash
git push heroku main
```

### Option 4: DigitalOcean App Platform

#### 1. Create App
- Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
- Click "Create App"

#### 2. Connect Repository
- Connect your GitHub repository
- Select the main branch

#### 3. Configure App
- **Build Command**: `npm run build`
- **Run Command**: `npm start`
- **Environment**: Node.js

#### 4. Add Redis Database
- Click "Create/Attach Database"
- Choose Redis
- Select plan (Basic $15/month recommended)

#### 5. Set Environment Variables
Add all required environment variables in the app configuration.

#### 6. Deploy
Click "Create Resources" to deploy your app.

## 🔧 Production Configuration

### Environment Variables

Ensure these are set in production:

```env
# Required
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+14152223333
TARGET_PHONE_NUMBER=+14155550123

# Optional (with defaults)
NODE_ENV=production
LOG_LEVEL=info
REDIS_URL=your_redis_url
DEFAULT_TTS_VOICE=alice
DEFAULT_CALL_DURATION=20
MAX_REMINDERS_PER_USER=50
MAX_REMINDER_DELAY_DAYS=30
```

### Redis Configuration

For production Redis, consider:

- **Upstash** - Serverless Redis with generous free tier
- **Redis Cloud** - Managed Redis by Redis Labs
- **AWS ElastiCache** - For AWS users
- **Google Cloud Memorystore** - For GCP users

### SSL/TLS

For production, ensure your bot has HTTPS endpoints:

```env
BASE_URL=https://your-domain.com
```

## 📊 Monitoring & Logs

### Health Checks

Your bot includes built-in health checks:

```bash
# Check bot status in Discord
?status
```

### Logs

Monitor logs for errors:

```bash
# Railway
railway logs

# Fly.io
fly logs

# Heroku
heroku logs --tail

# DigitalOcean
# View in App Platform dashboard
```

### Metrics

Track key metrics:
- Reminders scheduled per day
- Successful/failed calls
- Redis memory usage
- Bot response times

## 🔒 Security Considerations

### Environment Variables
- Never commit `.env` files to version control
- Use platform-specific secret management
- Rotate tokens regularly

### Discord Bot Security
- Use minimal required intents
- Restrict bot to specific servers if needed
- Monitor for abuse

### Twilio Security
- Keep auth tokens secure
- Monitor call logs for unusual activity
- Set up webhook validation

## 🚨 Troubleshooting

### Common Issues

#### Bot Not Responding
1. Check if bot is online in Discord
2. Verify bot has proper permissions
3. Check logs for errors

#### Redis Connection Issues
1. Verify Redis URL/credentials
2. Check Redis service status
3. Ensure network connectivity

#### Twilio Call Failures
1. Verify phone numbers are in E.164 format
2. Check Twilio account balance
3. Verify phone number verification status

#### Memory Issues
1. Monitor Redis memory usage
2. Check for memory leaks in logs
3. Consider upgrading Redis plan

### Getting Help

1. Check the logs for error messages
2. Verify all environment variables are set
3. Test components individually
4. Check platform-specific documentation

## 📈 Scaling Considerations

### Horizontal Scaling
- Deploy multiple bot instances
- Use Redis cluster for high availability
- Implement load balancing

### Performance Optimization
- Monitor Redis performance
- Optimize Twilio call patterns
- Implement caching where appropriate

### Cost Optimization
- Monitor Twilio usage
- Use appropriate Redis plans
- Consider reserved instances for long-term deployments

## 🔄 Continuous Deployment

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: bervProject/railway-deploy@v1.0.0
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
```

### Auto-deploy
- Enable auto-deploy in your platform
- Set up branch protection rules
- Test changes in staging environment first

## 📚 Additional Resources

- [Discord.js Documentation](https://discord.js.org/)
- [Twilio Voice API](https://www.twilio.com/docs/voice)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Redis Documentation](https://redis.io/documentation)
- [Platform-specific guides](#cloud-deployment)
