/**
 * Base Service Class
 * 
 * Provides common patterns and error handling for all external service integrations.
 * Implements retry logic, rate limiting awareness, and structured error responses.
 */

/**
 * Standard service response wrapper for consistent error handling
 */
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: ServiceError;
  metadata?: {
    requestId?: string;
    timestamp: string;
    service: string;
    rateLimitRemaining?: number;
  };
}

/**
 * Standardized service error structure
 */
export interface ServiceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  retryable: boolean;
  statusCode?: number;
}

/**
 * Configuration interface for service clients
 */
export interface ServiceConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  environment: 'sandbox' | 'production';
}

/**
 * Abstract base class for all external service integrations
 * Provides common functionality like error handling, logging, and retry logic
 */
export abstract class BaseService {
  protected readonly serviceName: string;
  protected readonly config: ServiceConfig;
  protected readonly logger: Console;

  constructor(serviceName: string, config: ServiceConfig) {
    this.serviceName = serviceName;
    this.config = {
      timeout: 30000, // 30 seconds default
      retryAttempts: 3,
      ...config,
    };
    this.logger = console; // In production, use proper logger like Winston
  }

  /**
   * Wraps service calls with consistent error handling and response formatting
   * @param operation - The async operation to execute
   * @param context - Additional context for logging
   * @returns Standardized service response
   */
  protected async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<ServiceResponse<T>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      this.logger.log(`[${this.serviceName}] Starting ${context} (${requestId})`);
      
      const data = await operation();
      
      const duration = Date.now() - startTime;
      this.logger.log(`[${this.serviceName}] Completed ${context} in ${duration}ms (${requestId})`);
      
      return {
        success: true,
        data,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          service: this.serviceName,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`[${this.serviceName}] Failed ${context} after ${duration}ms (${requestId}):`, error);
      
      return {
        success: false,
        error: this.normalizeError(error),
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          service: this.serviceName,
        },
      };
    }
  }

  /**
   * Retry wrapper for operations that might fail transiently
   * @param operation - The operation to retry
   * @param maxAttempts - Maximum number of attempts
   * @param delayMs - Delay between attempts in milliseconds
   * @returns Promise with the operation result
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = this.config.retryAttempts || 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on certain error types (e.g., authentication failures)
        if (!this.isRetryableError(error)) {
          throw lastError;
        }
        
        if (attempt === maxAttempts) {
          throw lastError;
        }
        
        // Exponential backoff
        const backoffDelay = delayMs * Math.pow(2, attempt - 1);
        this.logger.warn(`[${this.serviceName}] Attempt ${attempt} failed, retrying in ${backoffDelay}ms...`);
        await this.sleep(backoffDelay);
      }
    }
    
    throw lastError!;
  }

  /**
   * Normalize various error types into our standard ServiceError format
   * @param error - The error to normalize
   * @returns Standardized ServiceError
   */
  protected normalizeError(error: unknown): ServiceError {
    // Handle different error types from various APIs
    if (error && typeof error === 'object') {
      const err = error as any;
      
      // Plaid-style errors
      if (err.error_code && err.error_message) {
        return {
          code: err.error_code,
          message: err.error_message,
          details: err,
          retryable: this.isRetryableError(error),
          statusCode: err.status_code,
        };
      }
      
      // HTTP errors
      if (err.response) {
        return {
          code: err.response.status?.toString() || 'HTTP_ERROR',
          message: err.response.data?.message || err.message || 'HTTP request failed',
          details: err.response.data,
          retryable: this.isRetryableError(error),
          statusCode: err.response.status,
        };
      }
      
      // Standard Error objects
      if (err.message) {
        return {
          code: err.code || 'UNKNOWN_ERROR',
          message: err.message,
          details: err,
          retryable: this.isRetryableError(error),
        };
      }
    }
    
    // Fallback for unknown error types
    return {
      code: 'UNKNOWN_ERROR',
      message: String(error),
      details: { originalError: error },
      retryable: false,
    };
  }

  /**
   * Determine if an error is retryable based on common patterns
   * @param error - The error to check
   * @returns Whether the error should be retried
   */
  protected isRetryableError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }
    
    const err = error as any;
    
    // Network/timeout errors are generally retryable
    if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
      return true;
    }
    
    // HTTP 5xx errors are retryable, 4xx generally are not
    if (err.response?.status) {
      const status = err.response.status;
      return status >= 500 && status < 600;
    }
    
    // Service-specific retryable errors
    if (err.error_code) {
      const retryableCodes = ['RATE_LIMIT_EXCEEDED', 'INTERNAL_SERVER_ERROR', 'TIMEOUT'];
      return retryableCodes.includes(err.error_code);
    }
    
    return false;
  }

  /**
   * Generate a unique request ID for tracking
   * @returns Unique request identifier
   */
  protected generateRequestId(): string {
    return `${this.serviceName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep utility for retry delays
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after the delay
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate required configuration
   * @param requiredFields - Array of required configuration field names
   * @throws Error if required fields are missing
   */
  protected validateConfig(requiredFields: string[]): void {
    const missing = requiredFields.filter(field => !this.config[field as keyof ServiceConfig]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required configuration for ${this.serviceName}: ${missing.join(', ')}`);
    }
  }

  /**
   * Get service health status
   * @returns Basic health information
   */
  public getHealthStatus(): {
    service: string;
    status: 'configured' | 'unconfigured';
    environment: string;
    lastChecked: string;
  } {
    return {
      service: this.serviceName,
      status: this.config.apiKey ? 'configured' : 'unconfigured',
      environment: this.config.environment,
      lastChecked: new Date().toISOString(),
    };
  }
}
