import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { BaseService, ServiceConfig, ServiceError, ServiceResponse } from '../../services/base';

// Test implementation of BaseService
class TestService extends BaseService {
  constructor(config: ServiceConfig) {
    super('TestService', config);
  }

  // Expose protected methods for testing
  public async testExecuteWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<ServiceResponse<T>> {
    return this.executeWithErrorHandling(operation, context);
  }

  public async testWithRetry<T>(
    operation: () => Promise<T>,
    maxAttempts?: number,
    delayMs?: number
  ): Promise<T> {
    return this.withRetry(operation, maxAttempts, delayMs);
  }

  public testNormalizeError(error: unknown): ServiceError {
    return this.normalizeError(error);
  }

  public testIsRetryableError(error: unknown): boolean {
    return this.isRetryableError(error);
  }

  public testGenerateRequestId(): string {
    return this.generateRequestId();
  }

  public testValidateConfig(requiredFields: string[]): void {
    return this.validateConfig(requiredFields);
  }
}

describe('BaseService', () => {
  let service: TestService;
  const mockConfig: ServiceConfig = {
    apiKey: 'test-key',
    environment: 'sandbox',
    timeout: 5000,
    retryAttempts: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TestService(mockConfig);
  });

  describe('Constructor', () => {
    it('should initialize with provided config', () => {
      expect(service.getHealthStatus()).toEqual({
        service: 'TestService',
        status: 'configured',
        environment: 'sandbox',
        lastChecked: expect.any(String),
      });
    });

    it('should apply default values for missing config', () => {
      const minimalConfig: ServiceConfig = {
        environment: 'production',
      };
      const serviceWithDefaults = new TestService(minimalConfig);
      
      expect(serviceWithDefaults.getHealthStatus()).toEqual({
        service: 'TestService',
        status: 'unconfigured',
        environment: 'production',
        lastChecked: expect.any(String),
      });
    });
  });

  describe('executeWithErrorHandling', () => {
    it('should return success response for successful operation', async () => {
      const testData = { id: 123, name: 'test' };
      const operation = vi.fn().mockResolvedValue(testData);

      const result = await service.testExecuteWithErrorHandling(operation, 'test-operation');

      expect(result).toEqual({
        success: true,
        data: testData,
        metadata: {
          requestId: expect.any(String),
          timestamp: expect.any(String),
          service: 'TestService',
        },
      });
      expect(operation).toHaveBeenCalledOnce();
    });

    it('should return error response for failed operation', async () => {
      const testError = new Error('Test error');
      const operation = vi.fn().mockRejectedValue(testError);

      const result = await service.testExecuteWithErrorHandling(operation, 'test-operation');

      expect(result).toEqual({
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'Test error',
          details: testError,
          retryable: false,
        },
        metadata: {
          requestId: expect.any(String),
          timestamp: expect.any(String),
          service: 'TestService',
        },
      });
      expect(operation).toHaveBeenCalledOnce();
    });

    it('should include unique request ID in metadata', async () => {
      const operation = vi.fn().mockResolvedValue('test');
      
      const result1 = await service.testExecuteWithErrorHandling(operation, 'test-1');
      const result2 = await service.testExecuteWithErrorHandling(operation, 'test-2');

      expect(result1.metadata?.requestId).toBeDefined();
      expect(result2.metadata?.requestId).toBeDefined();
      expect(result1.metadata?.requestId).not.toBe(result2.metadata?.requestId);
    });
  });

  describe('withRetry', () => {
    it('should return result on first successful attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await service.testWithRetry(operation, 3, 10);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledOnce();
    });

    it('should retry on retryable errors', async () => {
      const retryableError = {
        code: 'ECONNRESET',
        message: 'Connection reset',
      };
      const operation = vi.fn()
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue('success');

      const result = await service.testWithRetry(operation, 3, 10);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const nonRetryableError = {
        response: { status: 401 },
        message: 'Unauthorized',
      };
      const operation = vi.fn().mockRejectedValue(nonRetryableError);

      await expect(service.testWithRetry(operation, 3, 10)).rejects.toThrow();
      expect(operation).toHaveBeenCalledOnce();
    });

    it('should throw error after max attempts', async () => {
      const retryableError = new Error('Timeout');
      (retryableError as any).code = 'ETIMEDOUT';
      const operation = vi.fn().mockRejectedValue(retryableError);

      await expect(service.testWithRetry(operation, 2, 10)).rejects.toThrow('Timeout');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('normalizeError', () => {
    it('should normalize Plaid-style errors', () => {
      const plaidError = {
        error_code: 'INVALID_CREDENTIALS',
        error_message: 'Invalid credentials provided',
        status_code: 401,
      };

      const result = service.testNormalizeError(plaidError);

      expect(result).toEqual({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials provided',
        details: plaidError,
        retryable: false,
        statusCode: 401,
      });
    });

    it('should normalize HTTP errors', () => {
      const httpError = {
        response: {
          status: 500,
          data: { message: 'Internal server error' },
        },
        message: 'Request failed',
      };

      const result = service.testNormalizeError(httpError);

      expect(result).toEqual({
        code: '500',
        message: 'Internal server error',
        details: httpError.response.data,
        retryable: true,
        statusCode: 500,
      });
    });

    it('should normalize standard Error objects', () => {
      const standardError = new Error('Something went wrong');
      standardError.name = 'CustomError';

      const result = service.testNormalizeError(standardError);

      expect(result).toEqual({
        code: 'UNKNOWN_ERROR',
        message: 'Something went wrong',
        details: standardError,
        retryable: false,
      });
    });

    it('should handle unknown error types', () => {
      const unknownError = 'string error';

      const result = service.testNormalizeError(unknownError);

      expect(result).toEqual({
        code: 'UNKNOWN_ERROR',
        message: 'string error',
        details: { originalError: unknownError },
        retryable: false,
      });
    });
  });

  describe('isRetryableError', () => {
    it('should identify network errors as retryable', () => {
      const networkErrors = [
        { code: 'ECONNRESET' },
        { code: 'ETIMEDOUT' },
        { code: 'ENOTFOUND' },
      ];

      networkErrors.forEach(error => {
        expect(service.testIsRetryableError(error)).toBe(true);
      });
    });

    it('should identify 5xx HTTP errors as retryable', () => {
      const serverErrors = [
        { response: { status: 500 } },
        { response: { status: 502 } },
        { response: { status: 503 } },
      ];

      serverErrors.forEach(error => {
        expect(service.testIsRetryableError(error)).toBe(true);
      });
    });

    it('should identify 4xx HTTP errors as non-retryable', () => {
      const clientErrors = [
        { response: { status: 400 } },
        { response: { status: 401 } },
        { response: { status: 404 } },
      ];

      clientErrors.forEach(error => {
        expect(service.testIsRetryableError(error)).toBe(false);
      });
    });

    it('should identify service-specific retryable errors', () => {
      const retryableServiceErrors = [
        { error_code: 'RATE_LIMIT_EXCEEDED' },
        { error_code: 'INTERNAL_SERVER_ERROR' },
        { error_code: 'TIMEOUT' },
      ];

      retryableServiceErrors.forEach(error => {
        expect(service.testIsRetryableError(error)).toBe(true);
      });
    });

    it('should handle non-object errors', () => {
      const nonObjectErrors = ['string', 123, null, undefined];

      nonObjectErrors.forEach(error => {
        expect(service.testIsRetryableError(error)).toBe(false);
      });
    });
  });

  describe('generateRequestId', () => {
    it('should generate unique request IDs', () => {
      const id1 = service.testGenerateRequestId();
      const id2 = service.testGenerateRequestId();

      expect(id1).toMatch(/^TestService_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^TestService_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('validateConfig', () => {
    it('should pass validation for existing required fields', () => {
      expect(() => {
        service.testValidateConfig(['apiKey', 'environment']);
      }).not.toThrow();
    });

    it('should throw error for missing required fields', () => {
      const serviceWithoutApiKey = new TestService({ environment: 'sandbox' });
      
      expect(() => {
        serviceWithoutApiKey.testValidateConfig(['apiKey']);
      }).toThrow('Missing required configuration for TestService: apiKey');
    });

    it('should throw error for multiple missing fields', () => {
      const serviceWithMinimalConfig = new TestService({ environment: 'sandbox' });
      
      expect(() => {
        serviceWithMinimalConfig.testValidateConfig(['apiKey', 'baseUrl']);
      }).toThrow('Missing required configuration for TestService: apiKey, baseUrl');
    });
  });

  describe('getHealthStatus', () => {
    it('should return configured status when apiKey is present', () => {
      const status = service.getHealthStatus();

      expect(status).toEqual({
        service: 'TestService',
        status: 'configured',
        environment: 'sandbox',
        lastChecked: expect.any(String),
      });
    });

    it('should return unconfigured status when apiKey is missing', () => {
      const serviceWithoutApiKey = new TestService({ environment: 'production' });
      const status = serviceWithoutApiKey.getHealthStatus();

      expect(status).toEqual({
        service: 'TestService',
        status: 'unconfigured',
        environment: 'production',
        lastChecked: expect.any(String),
      });
    });

    it('should return valid ISO timestamp', () => {
      const status = service.getHealthStatus();
      const timestamp = new Date(status.lastChecked);

      expect(timestamp.toISOString()).toBe(status.lastChecked);
    });
  });
});
