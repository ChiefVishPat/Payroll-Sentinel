/**
 * Base Service Tests
 * Tests core functionality like error handling and retry logic
 * Run with: node src/test-services/test-base.js
 */

const { BaseService } = require('../../dist/services/base');

// Create a test service to demonstrate BaseService features
class TestService extends BaseService {
  constructor() {
    super('test-service', { environment: 'sandbox' });
  }

  async testSuccess() {
    return this.executeWithErrorHandling(async () => {
      await this.sleep(100);
      return { message: 'Success!', timestamp: new Date().toISOString() };
    }, 'successful operation');
  }

  async testError() {
    return this.executeWithErrorHandling(async () => {
      throw new Error('Simulated API failure');
    }, 'failed operation');
  }

  async testRetry() {
    let attempts = 0;
    return this.executeWithErrorHandling(async () => {
      return this.withRetry(async () => {
        attempts++;
        if (attempts < 3) {
          // Create a retryable error (simulating a network timeout)
          const error = new Error(`Attempt ${attempts} failed`);
          error.code = 'ETIMEDOUT';
          throw error;
        }
        return { success: true, attempts };
      }, 3, 100); // Shorter delay for testing
    }, 'retry operation');
  }
}

async function testBase() {
  console.log('🔧 Testing Base Service...\n');
  
  const service = new TestService();
  
  console.log('📊 Service Health:');
  console.log(JSON.stringify(service.getHealthStatus(), null, 2));
  console.log();

  console.log('✅ Testing successful operation...');
  const success = await service.testSuccess();
  console.log(`Result: ${success.success ? '✅ Success' : '❌ Failed'}`);
  if (success.success) {
    console.log(`   Message: ${success.data.message}`);
  }
  console.log();

  console.log('❌ Testing error handling...');
  const error = await service.testError();
  console.log(`Result: ${!error.success ? '✅ Error handled correctly' : '❌ Unexpected success'}`);
  if (!error.success) {
    console.log(`   Error: ${error.error?.message}`);
  }
  console.log();

  console.log('🔄 Testing retry logic...');
  const retry = await service.testRetry();
  console.log(`Result: ${retry.success ? '✅ Retry succeeded' : '❌ Retry failed'}`);
  if (retry.success) {
    console.log(`   Attempts: ${retry.data.attempts}`);
  }
  console.log();

  console.log('✅ Base service tests completed!');
}

testBase().catch(error => {
  console.error('❌ Base service test failed:', error.message);
  process.exit(1);
});
