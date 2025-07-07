/**
 * Plaid Service Tests
 * Tests bank account integration functionality
 * Run with: node src/test-services/test-plaid.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { createPlaidService } = require('../../dist/services');

async function testPlaid() {
  console.log('🏦 Testing Plaid Service...\n');

  if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
    console.log('❌ Missing Plaid credentials. Set PLAID_CLIENT_ID and PLAID_SECRET in .env');
    process.exit(1);
  }

  // Check for placeholder values
  if (process.env.PLAID_CLIENT_ID === 'your_plaid_client_id' || process.env.PLAID_SECRET === 'your_plaid_secret') {
    console.log('❌ Plaid credentials are placeholder values.');
    console.log('   Please replace PLAID_CLIENT_ID and PLAID_SECRET in .env with real credentials from Plaid.');
    console.log('   Visit: https://dashboard.plaid.com/team/keys');
    process.exit(1);
  }

  const plaidService = createPlaidService({
    clientId: process.env.PLAID_CLIENT_ID,
    secret: process.env.PLAID_SECRET,
    environment: 'sandbox'
  });

  console.log('📊 Service Status:');
  console.log(JSON.stringify(plaidService.getHealthStatus(), null, 2));
  console.log();

  console.log('🔗 Creating link token...');
  const linkToken = await plaidService.createLinkToken('test_user_123');
  
  if (linkToken.success) {
    console.log('✅ Link token created successfully');
    console.log(`   Token: ${linkToken.data.linkToken.substring(0, 30)}...`);
  } else {
    console.log('❌ Link token creation failed:', linkToken.error?.message);
    return;
  }

  console.log('\n🏪 Creating sandbox account...');
  const publicToken = await plaidService.createSandboxPublicToken();
  
  if (publicToken.success) {
    console.log('✅ Sandbox account created');
    
    console.log('\n🔄 Exchanging for access token...');
    const accessToken = await plaidService.exchangePublicToken(publicToken.data);
    
    if (accessToken.success) {
      console.log('✅ Access token obtained');
      
      console.log('\n📋 Fetching account details...');
      const accounts = await plaidService.getAccounts(accessToken.data.accessToken);
      
      if (accounts.success) {
        console.log(`✅ Found ${accounts.data.length} accounts`);
        accounts.data.forEach((account, i) => {
          console.log(`   ${i + 1}. ${account.name} (${account.type})`);
        });
      }
      
      console.log('\n💰 Checking balances...');
      const balances = await plaidService.getBalances(accessToken.data.accessToken);
      
      if (balances.success) {
        console.log('✅ Balance information retrieved');
        balances.data.forEach((balance, i) => {
          console.log(`   ${i + 1}. Current: $${balance.current.toLocaleString()}`);
        });
      }
    }
  }

  console.log('\n✅ Plaid tests completed!');
}

testPlaid().catch(error => {
  console.error('❌ Plaid test failed:', error.message);
  process.exit(1);
});
