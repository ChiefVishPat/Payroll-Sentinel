#!/usr/bin/env node

// Simple test script for Plaid Link MVP
const https = require('https');
const http = require('http');

console.log('🚀 Testing Plaid Link MVP Implementation...\n');

// Test 1: Check if server starts and health endpoint works
console.log('1. Testing server health...');
const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/health',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`✅ Health check responded with status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const health = JSON.parse(data);
      console.log(`✅ Health response:`, health);
      console.log(`✅ Plaid service status: ${health.services?.plaid ? 'Ready' : 'Not configured'}`);
      
      // Test 2: Check banking routes
      console.log('\n2. Testing banking routes...');
      testBankingRoutes();
    } catch (error) {
      console.error('❌ Failed to parse health response:', error);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Health check failed:', err.message);
  console.log('💡 Make sure the backend server is running with: npm run dev');
  process.exit(1);
});

req.end();

function testBankingRoutes() {
  // Test link-token endpoint
  const linkTokenOptions = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/banking/link-token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-secret': process.env.API_SECRET || 'dev-demo-secret'
    }
  };

  const linkTokenReq = http.request(linkTokenOptions, (res) => {
    console.log(`✅ Link token endpoint responded with status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        if (response.success) {
          console.log('✅ Link token endpoint is working!');
          console.log(`✅ Link token created: ${response.linkToken?.substring(0, 20)}...`);
        } else {
          console.log('⚠️  Link token endpoint returned an error:', response.error);
        }
      } catch (error) {
        console.error('❌ Failed to parse link token response:', error);
      }
      
      console.log('\n🎉 Plaid Link MVP test completed!');
      console.log('\n📝 Next steps:');
      console.log('1. Set up your Plaid sandbox credentials in backend/.env');
      console.log('2. Start the frontend: cd frontend && npm run dev');
      console.log('3. Test the full flow in the browser');
    });
  });

  linkTokenReq.on('error', (err) => {
    console.error('❌ Link token test failed:', err.message);
  });

  linkTokenReq.write(JSON.stringify({
    userId: 'test-user-123'
  }));
  linkTokenReq.end();
}
