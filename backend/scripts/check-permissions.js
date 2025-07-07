#!/usr/bin/env node

/**
 * API Permissions Checker
 * 
 * This script checks if all required API permissions are properly configured
 * Run with: node scripts/check-permissions.js
 */

require('dotenv').config({ path: '../.env' });

const { createPlaidService, createSlackService, createCheckService } = require('../dist/services');

async function checkPermissions() {
  console.log('🔐 Checking API Permissions...\n');

  // Check Plaid permissions
  console.log('=== Plaid API ===');
  try {
    const plaidService = createPlaidService({
      clientId: process.env.PLAID_CLIENT_ID,
      secret: process.env.PLAID_SECRET,
      environment: 'sandbox'
    });

    console.log('✅ Plaid service initialized');
    
    // Test link token creation (this will show which products are available)
    const linkTokenResult = await plaidService.createLinkToken('permission_test_user');
    
    if (linkTokenResult.success) {
      console.log('✅ Plaid link token creation: SUCCESS');
      console.log('   → Required products: auth, accounts, transactions');
      console.log('   → Status: All permissions working');
    } else {
      console.log('❌ Plaid link token creation: FAILED');
      console.log('   → Error:', linkTokenResult.error?.details?.error_message);
      if (linkTokenResult.error?.details?.error_code === 'INVALID_PRODUCT') {
        console.log('   → Fix: Enable "auth", "accounts", and "transactions" products in Plaid Dashboard');
        console.log('   → URL: https://dashboard.plaid.com → Team Settings → API → Products');
      }
    }
  } catch (error) {
    console.log('❌ Plaid service failed to initialize:', error.message);
  }
  
  console.log();

  // Check Slack permissions
  console.log('=== Slack API ===');
  try {
    const slackService = createSlackService({
      botToken: process.env.SLACK_BOT_TOKEN,
      channelId: process.env.SLACK_CHANNEL_ID,
      environment: 'sandbox'
    });

    console.log('✅ Slack service initialized');
    
    // Test connection (this will show which scopes are missing)
    const connectionResult = await slackService.testConnection();
    
    if (connectionResult.success) {
      console.log('✅ Slack connection test: SUCCESS');
      console.log('   → All required permissions granted');
    } else {
      console.log('❌ Slack connection test: FAILED');
      console.log('   → Error:', connectionResult.error?.message);
      
      if (connectionResult.error?.details?.data?.error === 'missing_scope') {
        const needed = connectionResult.error.details.data.needed;
        const provided = connectionResult.error.details.data.provided;
        
        console.log('   → Currently have:', provided);
        console.log('   → Need to add:', needed);
        console.log('   → Fix: Add missing scopes in Slack App settings');
        console.log('   → URL: https://api.slack.com/apps → OAuth & Permissions → Bot Token Scopes');
        console.log('   → After adding scopes, reinstall the app to your workspace');
      }
    }
    
    // Test basic messaging (this should work with current permissions)
    console.log('\n   Testing basic messaging...');
    const messageResult = await slackService.sendNotification(
      'Permission Test', 
      'Testing Slack API permissions - you can ignore this message', 
      'info'
    );
    
    if (messageResult.success) {
      console.log('   ✅ Message sending: SUCCESS');
    } else {
      console.log('   ❌ Message sending: FAILED');
      console.log('      Error:', messageResult.error?.message);
    }
    
  } catch (error) {
    console.log('❌ Slack service failed to initialize:', error.message);
  }
  
  console.log();

  // Check mock service (should always work)
  console.log('=== Check API (Mock) ===');
  try {
    const checkService = createCheckService({
      apiKey: 'demo_key',
      environment: 'sandbox'
    });

    console.log('✅ Check service initialized');
    
    const employeesResult = await checkService.getEmployees('permission_test_company');
    
    if (employeesResult.success) {
      console.log('✅ Mock data access: SUCCESS');
      console.log(`   → Found ${employeesResult.data.length} test employees`);
    } else {
      console.log('❌ Mock data access: FAILED');
    }
    
  } catch (error) {
    console.log('❌ Check service failed to initialize:', error.message);
  }
}

checkPermissions().catch(console.error);
