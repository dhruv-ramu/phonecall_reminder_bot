const { ReminderQueue } = require('./dist/queue/ReminderQueue');
const { RedisConnection } = require('./dist/queue/RedisConnection');
const { ReminderWorker } = require('./dist/worker/ReminderWorker');
const { Config } = require('./dist/config/Config');
require('dotenv').config();

async function testReminderFlow() {
  console.log('🧪 Testing Discord Reminder Bot Flow...');
  
  try {
    // Initialize configuration
    const config = new Config();
    console.log('✅ Configuration loaded');

    // Initialize Redis connection
    const redisConnection = new RedisConnection(config);
    await redisConnection.connect();
    console.log('✅ Redis connected');

    // Initialize reminder queue
    const reminderQueue = new ReminderQueue(redisConnection);
    console.log('✅ Reminder queue initialized');
    
    // Initialize reminder worker
    const reminderWorker = new ReminderWorker(redisConnection, reminderQueue);
    await reminderWorker.start();
    console.log('✅ Reminder worker started');

    // Simulate a Discord bot receiving a reminder command
    console.log('\n📝 Simulating Discord command: ?remind Test reminder in 30 seconds -t 30s');
    
    const message = 'Test reminder in 30 seconds';
    const delayMs = 30 * 1000; // 30 seconds
    const userId = 'test-user-123';
    const channelId = 'test-channel-456';
    const messageId = 'test-message-789';

    // Add reminder to queue
    const job = await reminderQueue.addReminder(
      message,
      delayMs,
      userId,
      channelId,
      messageId
    );

    console.log(`✅ Reminder scheduled! Job ID: ${job.id}`);
    console.log(`⏰ Will execute in ${delayMs / 1000} seconds`);
    console.log(`📱 Will call: ${config.targetPhoneNumber}`);

    // Wait for the reminder to execute
    console.log('\n⏳ Waiting for reminder to execute...');
    console.log('📞 Your phone should ring in about 30 seconds...');
    
    // Wait for 35 seconds to ensure the call is made
    await new Promise(resolve => setTimeout(resolve, 35000));

    // Check job status
    const jobStatus = await reminderQueue.getReminder(job.id);
    if (jobStatus) {
      console.log(`\n📊 Job Status: ${jobStatus.finishedOn ? 'Completed' : 'Still processing'}`);
      if (jobStatus.finishedOn) {
        console.log(`✅ Reminder completed at: ${new Date(jobStatus.finishedOn).toLocaleString()}`);
      }
    }

    // Get queue stats
    const stats = await reminderQueue.getQueueStats();
    console.log('\n📋 Queue Statistics:');
    console.log(`   Waiting: ${stats.waiting}`);
    console.log(`   Active: ${stats.active}`);
    console.log(`   Completed: ${stats.completed}`);
    console.log(`   Failed: ${stats.failed}`);
    console.log(`   Delayed: ${stats.delayed}`);

    // Cleanup
    await reminderWorker.stop();
    await redisConnection.disconnect();
    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testReminderFlow().catch(console.error);
