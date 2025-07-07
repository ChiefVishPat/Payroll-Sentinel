/**
 * All Services Test Runner
 * Tests all services together with status overview
 * Run with: node src/test-services/test-all.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { createPlaidService, createSlackService, createCheckService } = require('../../dist/services');

async function testAll() {
  console.log('🚀 Testing All Services...\n');

  // Check environment variables
  const hasPlaidCreds = !!(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);
  const hasSlackCreds = !!(process.env.SLACK_BOT_TOKEN && process.env.SLACK_CHANNEL_ID);

  console.log('=== 📊 SERVICE STATUS ===\n');

  // 1. Check Service (always works)
  console.log('📋 Check Service:');
  const checkService = createCheckService({ apiKey: 'demo_key', environment: 'sandbox' });
  console.log('✅ Initialized (mock data)');
  console.log(`   Health: ${checkService.getHealthStatus().status}`);
  
  // Quick test
  const employees = await checkService.getEmployees('test_company');
  console.log(`   Test: ${employees.success ? '✅ ' + employees.data.length + ' employees' : '❌ Failed'}`);
  console.log();

  // 2. Plaid Service
  console.log('🏦 Plaid Service:');
  if (hasPlaidCreds) {
    try {
      const plaidService = createPlaidService({
        clientId: process.env.PLAID_CLIENT_ID,
        secret: process.env.PLAID_SECRET,
        environment: 'sandbox'
      });
      console.log('✅ Initialized with credentials');
      console.log(`   Health: ${plaidService.getHealthStatus().status}`);
      
      // Quick test
      const linkToken = await plaidService.createLinkToken('test_user');
      console.log(`   Test: ${linkToken.success ? '✅ Link token created' : '❌ Failed'}`);
    } catch (error) {
      console.log('❌ Failed to initialize:', error.message);
    }
  } else {
    console.log('⚠️ Not configured (missing PLAID_CLIENT_ID or PLAID_SECRET)');
  }
  console.log();

  // 3. Slack Service
  console.log('📢 Slack Service:');
  if (hasSlackCreds) {
    try {
      const slackService = createSlackService({
        botToken: process.env.SLACK_BOT_TOKEN,
        channelId: process.env.SLACK_CHANNEL_ID,
        environment: 'sandbox'
      });
      console.log('✅ Initialized with credentials');
      console.log(`   Health: ${slackService.getHealthStatus().status}`);
      
      // Quick test
      const notification = await slackService.sendNotification(
        'Test from All Services',
        'All services test run completed successfully',
        'info'
      );
      console.log(`   Test: ${notification.success ? '✅ Notification sent' : '❌ Failed'}`);
    } catch (error) {
      console.log('❌ Failed to initialize:', error.message);
    }
  } else {
    console.log('⚠️ Not configured (missing SLACK_BOT_TOKEN or SLACK_CHANNEL_ID)');
  }
  console.log();

  console.log('=== 🏁 SUMMARY ===\n');
  console.log(`✅ Check Service: Ready (uses mock data)`);
  console.log(`${hasPlaidCreds ? '✅' : '⚠️'} Plaid Service: ${hasPlaidCreds ? 'Configured' : 'Needs configuration'}`);
  console.log(`${hasSlackCreds ? '✅' : '⚠️'} Slack Service: ${hasSlackCreds ? 'Configured' : 'Needs configuration'}`);
  
  console.log('\n📝 INDIVIDUAL TESTS:');
  console.log('   Run: node src/test-services/test-check.js');
  console.log('   Run: node src/test-services/test-plaid.js');
  console.log('   Run: node src/test-services/test-slack.js');
  
  if (!hasPlaidCreds || !hasSlackCreds) {
    console.log('\n💡 SETUP NEEDED:');
    if (!hasPlaidCreds) {
      console.log('   Set PLAID_CLIENT_ID and PLAID_SECRET in .env');
    }
    if (!hasSlackCreds) {
      console.log('   Set SLACK_BOT_TOKEN and SLACK_CHANNEL_ID in .env');
    }
  }
}

testAll().catch(error => {
  console.error('❌ All services test failed:', error.message);
  process.exit(1);
});
