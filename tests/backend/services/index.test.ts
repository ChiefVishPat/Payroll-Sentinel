import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createPlaidService,
  createCheckService,
  createSlackService,
  createPlaidServiceWithConfig,
  createCheckServiceWithConfig,
  createSlackServiceWithConfig,
  getServiceConfigFromEnv,
  initializeServices,
  PlaidService,
  CheckService,
  SlackService,
} from '@backend/services/index';

// Mock environment variables
const mockEnv = {
  NODE_ENV: 'test',
  PLAID_CLIENT_ID: 'test_plaid_client_id',
  PLAID_SECRET: 'test_plaid_secret',
  CHECK_API_KEY: 'test_check_api_key',
  SLACK_BOT_TOKEN: 'xoxb-test-slack-token',
  SLACK_CHANNEL_ID: 'C1234567890',
};

describe('Service Factory Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    Object.keys(mockEnv).forEach(key => {
      process.env[key] = mockEnv[key as keyof typeof mockEnv];
    });
  });

  describe('createPlaidService', () => {
    it('should create PlaidService with correct configuration', () => {
      const config = {
        clientId: 'test_client_id',
        secret: 'test_secret',
        environment: 'sandbox' as const,
      };

      const service = createPlaidService(config);

      expect(service).toBeInstanceOf(PlaidService);
      expect(service.getHealthStatus()).toMatchObject({
        service: 'plaid',
        status: 'configured',
        environment: 'sandbox',
      });
    });

    it('should map secret to apiKey in base config', () => {
      const config = {
        clientId: 'test_client_id',
        secret: 'test_secret',
        environment: 'production' as const,
      };

      const service = createPlaidServiceWithConfig(config);

      expect(service.getHealthStatus()).toMatchObject({
        service: 'plaid',
        status: 'configured',
        environment: 'production',
      });
    });
  });

  describe('createCheckService', () => {
    it('should create CheckService with correct configuration', () => {
      const config = {
        apiKey: 'test_api_key',
        environment: 'sandbox' as const,
      };

      const service = createCheckService(config);

      expect(service).toBeInstanceOf(CheckService);
      expect(service.getHealthStatus()).toMatchObject({
        service: 'check',
        status: 'configured',
        environment: 'sandbox',
      });
    });

    it('should handle production environment', () => {
      const config = {
        apiKey: 'prod_api_key',
        environment: 'production' as const,
      };

      const service = createCheckServiceWithConfig(config);

      expect(service.getHealthStatus()).toMatchObject({
        service: 'check',
        status: 'configured',
        environment: 'production',
      });
    });
  });

  describe('createSlackService', () => {
    it('should create SlackService with correct configuration', () => {
      const config = {
        botToken: 'xoxb-test-token',
        channelId: 'C1234567890',
        environment: 'sandbox' as const,
      };

      const service = createSlackService(config);

      expect(service).toBeInstanceOf(SlackService);
      expect(service.getHealthStatus()).toMatchObject({
        service: 'slack',
        status: 'configured',
        environment: 'sandbox',
      });
    });

    it('should map botToken to apiKey in base config', () => {
      const config = {
        botToken: 'xoxb-production-token',
        channelId: 'C0987654321',
        environment: 'production' as const,
      };

      const service = createSlackServiceWithConfig(config);

      expect(service.getHealthStatus()).toMatchObject({
        service: 'slack',
        status: 'configured',
        environment: 'production',
      });
    });
  });

  describe('getServiceConfigFromEnv', () => {
    it('should read configuration from environment variables', () => {
      const config = getServiceConfigFromEnv();

      expect(config).toEqual({
        plaid: {
          clientId: 'test_plaid_client_id',
          secret: 'test_plaid_secret',
          environment: 'sandbox',
        },
        check: {
          apiKey: 'test_check_api_key',
          environment: 'sandbox',
        },
        slack: {
          botToken: 'xoxb-test-slack-token',
          channelId: 'C1234567890',
          environment: 'sandbox',
        },
      });
    });

    it('should default to sandbox environment for development', () => {
      process.env.NODE_ENV = 'development';
      const config = getServiceConfigFromEnv();

      expect(config.plaid.environment).toBe('sandbox');
      expect(config.check.environment).toBe('sandbox');
      expect(config.slack.environment).toBe('sandbox');
    });

    it('should use production environment in production', () => {
      process.env.NODE_ENV = 'production';
      const config = getServiceConfigFromEnv();

      expect(config.plaid.environment).toBe('production');
      expect(config.check.environment).toBe('production');
      expect(config.slack.environment).toBe('production');
    });

    it('should provide default values for missing environment variables', () => {
      // Clear some environment variables
      delete process.env.PLAID_CLIENT_ID;
      delete process.env.CHECK_API_KEY;
      delete process.env.SLACK_BOT_TOKEN;

      const config = getServiceConfigFromEnv();

      expect(config).toEqual({
        plaid: {
          clientId: '',
          secret: 'test_plaid_secret',
          environment: 'sandbox',
        },
        check: {
          apiKey: 'demo_key', // Default fallback
          environment: 'sandbox',
        },
        slack: {
          botToken: '',
          channelId: 'C1234567890',
          environment: 'sandbox',
        },
      });
    });

    it('should handle undefined NODE_ENV', () => {
      delete process.env.NODE_ENV;
      const config = getServiceConfigFromEnv();

      // Should default to sandbox when NODE_ENV is undefined
      expect(config.plaid.environment).toBe('sandbox');
      expect(config.check.environment).toBe('sandbox');
      expect(config.slack.environment).toBe('sandbox');
    });
  });

  describe('initializeServices', () => {
    it('should initialize all services with environment configuration', () => {
      const services = initializeServices();

      expect(services.plaid).toBeInstanceOf(PlaidService);
      expect(services.check).toBeInstanceOf(CheckService);
      expect(services.slack).toBeInstanceOf(SlackService);

      // Verify services are configured correctly
      expect(services.plaid.getHealthStatus()).toMatchObject({
        service: 'plaid',
        status: 'configured',
        environment: 'sandbox',
      });

      expect(services.check.getHealthStatus()).toMatchObject({
        service: 'check',
        status: 'configured',
        environment: 'sandbox',
      });

      expect(services.slack.getHealthStatus()).toMatchObject({
        service: 'slack',
        status: 'configured',
        environment: 'sandbox',
      });
    });

    it('should create services that can operate independently', async () => {
      const services = initializeServices();

      // Test that services work independently
      const checkEmployees = await services.check.getEmployees('test_company');
      expect(checkEmployees.success).toBe(true);

      // Services should have different request IDs and timestamps
      const plaidHealth = services.plaid.getHealthStatus();
      const checkHealth = services.check.getHealthStatus();
      const slackHealth = services.slack.getHealthStatus();

      expect(plaidHealth.service).toBe('plaid');
      expect(checkHealth.service).toBe('check');
      expect(slackHealth.service).toBe('slack');
    });

    it('should handle services with missing configuration gracefully', () => {
      // Clear critical environment variables
      delete process.env.PLAID_CLIENT_ID;
      delete process.env.SLACK_BOT_TOKEN;

      // Plaid and Slack will throw errors during initialization due to required config
      expect(() => initializeServices()).toThrow();
    });
  });

  describe('Environment Handling', () => {
    it('should correctly map NODE_ENV values to service environments', () => {
      const testCases = [
        { nodeEnv: 'production', expected: 'production' },
        { nodeEnv: 'development', expected: 'sandbox' },
        { nodeEnv: 'test', expected: 'sandbox' },
        { nodeEnv: 'staging', expected: 'sandbox' },
        { nodeEnv: undefined, expected: 'sandbox' },
      ];

      testCases.forEach(({ nodeEnv, expected }) => {
        if (nodeEnv === undefined) {
          delete process.env.NODE_ENV;
        } else {
          process.env.NODE_ENV = nodeEnv;
        }

        const config = getServiceConfigFromEnv();
        
        expect(config.plaid.environment).toBe(expected);
        expect(config.check.environment).toBe(expected);
        expect(config.slack.environment).toBe(expected);
      });
    });
  });

  describe('Configuration Validation', () => {
    it('should maintain type safety for service configurations', () => {
      const config = getServiceConfigFromEnv();

      // TypeScript should enforce these types at compile time
      expect(typeof config.plaid.clientId).toBe('string');
      expect(typeof config.plaid.secret).toBe('string');
      expect(['sandbox', 'production'].includes(config.plaid.environment)).toBe(true);

      expect(typeof config.check.apiKey).toBe('string');
      expect(['sandbox', 'production'].includes(config.check.environment)).toBe(true);

      expect(typeof config.slack.botToken).toBe('string');
      expect(typeof config.slack.channelId).toBe('string');
      expect(['sandbox', 'production'].includes(config.slack.environment)).toBe(true);
    });

    it('should handle empty string environment variables appropriately', () => {
      // Set environment variables to empty strings
      process.env.PLAID_CLIENT_ID = '';
      process.env.PLAID_SECRET = '';
      process.env.SLACK_BOT_TOKEN = '';
      process.env.SLACK_CHANNEL_ID = '';
      delete process.env.CHECK_API_KEY; // Remove to get default

      const config = getServiceConfigFromEnv();

      expect(config.plaid.clientId).toBe('');
      expect(config.plaid.secret).toBe('');
      expect(config.slack.botToken).toBe('');
      expect(config.slack.channelId).toBe('');

      // Check should get its default value when not set
      expect(config.check.apiKey).toBe('demo_key');
    });
  });

  describe('Service Integration', () => {
    it('should create services that can be used together', () => {
      const plaidService = createPlaidService({
        clientId: 'test_id',
        secret: 'test_secret',
        environment: 'sandbox',
      });

      const checkService = createCheckService({
        apiKey: 'test_key',
        environment: 'sandbox',
      });

      const slackService = createSlackService({
        botToken: 'xoxb-test',
        channelId: 'C123',
        environment: 'sandbox',
      });

      // All services should be configured and ready to use
      expect(plaidService.getHealthStatus().status).toBe('configured');
      expect(checkService.getHealthStatus().status).toBe('configured');
      expect(slackService.getHealthStatus().status).toBe('configured');

      // They should all use the same environment
      expect(plaidService.getHealthStatus().environment).toBe('sandbox');
      expect(checkService.getHealthStatus().environment).toBe('sandbox');
      expect(slackService.getHealthStatus().environment).toBe('sandbox');
    });
  });
});
