/**
 * Slack Service Tests
 * Tests notification and alerting functionality
 * Run with: node src/test-services/test-slack.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { createSlackService } = require('../../dist/services');

async function testSlack() {
  console.log('📢 Testing Slack Service...\n');

  if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_CHANNEL_ID) {
    console.log('❌ Missing Slack credentials. Set SLACK_BOT_TOKEN and SLACK_CHANNEL_ID in .env');
    process.exit(1);
  }

  // Check for placeholder values
  if (process.env.SLACK_CHANNEL_ID === 'your_slack_channel_id') {
    console.log('❌ Slack channel ID is a placeholder value.');
    console.log('   Please replace SLACK_CHANNEL_ID in .env with a real channel ID from your Slack workspace.');
    console.log('   Example: C1234567890 or #channel-name');
    process.exit(1);
  }

  const slackService = createSlackService({
    botToken: process.env.SLACK_BOT_TOKEN,
    channelId: process.env.SLACK_CHANNEL_ID,
    environment: 'sandbox'
  });

  console.log('📊 Service Status:');
  console.log(JSON.stringify(slackService.getHealthStatus(), null, 2));
  console.log();

  console.log('🔌 Testing connection...');
  const connection = await slackService.testConnection();
  
  if (connection.success) {
    console.log('✅ Connection successful');
  } else {
    console.log('⚠️ Connection test failed (but messaging might still work)');
    console.log('   Error:', connection.error?.message);
  }

  console.log('\n📝 Sending test notification...');
  const notification = await slackService.sendNotification(
    'Test Notification',
    'This is a test message from Payroll Sentinel',
    'info'
  );
  
  if (notification.success) {
    console.log('✅ Notification sent successfully');
    console.log(`   Message ID: ${notification.data.messageId}`);
  } else {
    console.log('❌ Notification failed:', notification.error?.message);
    return;
  }

  console.log('\n🚨 Sending risk alert...');
  const alert = await slackService.sendRiskAlert({
    companyName: 'Test Company',
    currentBalance: 45000,
    requiredFloat: 50000,
    payrollDate: '2024-01-16',
    payrollAmount: 48000,
    daysUntilPayroll: 3,
    riskLevel: 'at_risk'
  });
  
  if (alert.success) {
    console.log('✅ Risk alert sent successfully');
    console.log(`   Alert ID: ${alert.data.messageId}`);
  } else {
    console.log('❌ Risk alert failed:', alert.error?.message);
  }

  console.log('\n✅ Slack tests completed!');
  console.log('💡 Check your Slack channel for the test messages');
}

testSlack().catch(error => {
  console.error('❌ Slack test failed:', error.message);
  process.exit(1);
});
