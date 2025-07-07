/**
 * Base Service Module
 * 
 * Provides foundational classes and types for all external service integrations.
 * Implements standardized error handling, retry logic, and response formatting.
 * 
 * @author Payroll Sentinel Team
 * @version 1.0.0
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Standard service response wrapper for consistent API responses
 * 
 * @template T - Type of the response data
 */
export interface ServiceResponse<T> {
  /** Whether the operation succeeded */
  success: boolean;
  /** Response data (present when success is true) */
  data?: T;
  /** Error information (present when success is false) */
  error?: ServiceError;
  /** Additional metadata about the request */
  metadata?: ServiceMetadata;
}

/**
 * Metadata included with all service responses
 */
export interface ServiceMetadata {
  /** Unique identifier for request tracking */
  requestId: string;
  /** ISO timestamp of the request */
  timestamp: string;
  /** Name of the service that handled the request */
  service: string;
  /** Remaining rate limit quota (if applicable) */
  rateLimitRemaining?: number;
}

/**
 * Standardized error structure for all services
 */
export interface ServiceError {
  /** Error code for programmatic handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error context */
  details?: Record<string, unknown>;
  /** Whether this error can be retried */
  retryable: boolean;
  /** HTTP status code (if applicable) */
  statusCode?: number;
}

/**
 * Base configuration for all service integrations
 */
export interface ServiceConfig {
  /** API key for authentication */
  apiKey?: string;
  /** Base URL for API endpoints */
  baseUrl?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum retry attempts for failed requests */
  retryAttempts?: number;
  /** Environment context */
  environment: 'sandbox' | 'production';
}

// ============================================================================
// BASE SERVICE CLASS
// ============================================================================

/**
 * Abstract base class for all external service integrations
 * 
 * Provides standardized patterns for:
 * - Error handling and response formatting
 * - Retry logic with exponential backoff
 * - Request logging and monitoring
 * - Configuration validation
 * 
 * @abstract
 */
export abstract class BaseService {
  protected readonly serviceName: string;
  protected readonly config: ServiceConfig;
  protected readonly logger: Console;

  constructor(serviceName: string, config: ServiceConfig) {
    this.serviceName = serviceName;
    this.config = this.buildConfig(config);
    this.logger = console; // TODO: Replace with Winston in production
  }

  // ========================================================================
  // PRIVATE CONFIGURATION METHODS
  // ========================================================================

  /**
   * Builds configuration with sensible defaults
   */
  private buildConfig(config: ServiceConfig): ServiceConfig {
    return {
      timeout: 30000, // 30 seconds
      retryAttempts: 3,
      ...config,
    };
  }

  // ========================================================================
  // PUBLIC EXECUTION METHODS
  // ========================================================================

  /**
   * Executes operations with standardized error handling and logging
   * 
   * @param operation - Async operation to execute
   * @param context - Description for logging purposes
   * @returns Standardized service response
   */
  protected async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<ServiceResponse<T>> {
    const { requestId, startTime } = this.initializeRequest(context);

    try {
      const data = await operation();
      return this.createSuccessResponse(data, requestId, startTime, context);
    } catch (error) {
      return this.createErrorResponse(error, requestId, startTime, context);
    }
  }

  /**
   * Executes operation with retry logic for transient failures
   * 
   * @param operation - Operation to retry
   * @param maxAttempts - Maximum retry attempts (defaults to config)
   * @param baseDelayMs - Base delay between retries
   * @returns Operation result
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = this.config.retryAttempts || 3,
    baseDelayMs: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (!this.isRetryableError(error) || attempt === maxAttempts) {
          throw lastError;
        }
        
        await this.delayBeforeRetry(baseDelayMs, attempt);
      }
    }
    
    throw lastError!;
  }

  // ========================================================================
  // PRIVATE HELPER METHODS
  // ========================================================================

  /**
   * Initializes request tracking and logging
   */
  private initializeRequest(context: string): { requestId: string; startTime: number } {
    const requestId = this.generateRequestId();
    const startTime = Date.now();
    this.logger.log(`[${this.serviceName}] Starting ${context} (${requestId})`);
    return { requestId, startTime };
  }

  /**
   * Creates standardized success response
   */
  private createSuccessResponse<T>(
    data: T,
    requestId: string,
    startTime: number,
    context: string
  ): ServiceResponse<T> {
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
  }

  /**
   * Creates standardized error response
   */
  private createErrorResponse(
    error: unknown,
    requestId: string,
    startTime: number,
    context: string
  ): ServiceResponse<never> {
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

  /**
   * Implements exponential backoff delay
   */
  private async delayBeforeRetry(baseDelayMs: number, attempt: number): Promise<void> {
    const backoffDelay = baseDelayMs * Math.pow(2, attempt - 1);
    this.logger.warn(`[${this.serviceName}] Attempt ${attempt} failed, retrying in ${backoffDelay}ms...`);
    await this.sleep(backoffDelay);
  }

  // ========================================================================
  // ERROR HANDLING METHODS
  // ========================================================================

  /**
   * Normalizes various error types into standardized ServiceError format
   * 
   * @param error - Raw error from operation
   * @returns Standardized ServiceError
   */
  protected normalizeError(error: unknown): ServiceError {
    if (!error || typeof error !== 'object') {
      return this.createFallbackError(error);
    }

    const err = error as any;
    const isRetryable = this.isRetryableError(error);

    // Plaid API errors
    if (err.error_code && err.error_message) {
      return {
        code: err.error_code,
        message: err.error_message,
        details: err,
        retryable: isRetryable,
        statusCode: err.status_code,
      };
    }

    // HTTP response errors
    if (err.response) {
      return {
        code: err.response.status?.toString() || 'HTTP_ERROR',
        message: err.response.data?.message || err.message || 'HTTP request failed',
        details: err.response.data,
        retryable: isRetryable,
        statusCode: err.response.status,
      };
    }

    // Standard Error objects
    if (err.message) {
      return {
        code: err.code || 'UNKNOWN_ERROR',
        message: err.message,
        details: err,
        retryable: isRetryable,
      };
    }

    return this.createFallbackError(error);
  }

  /**
   * Creates fallback error for unknown error types
   */
  private createFallbackError(error: unknown): ServiceError {
    return {
      code: 'UNKNOWN_ERROR',
      message: String(error),
      details: { originalError: error },
      retryable: false,
    };
  }

  /**
   * Determines if an error should be retried based on error patterns
   * 
   * @param error - Error to evaluate
   * @returns True if error is retryable
   */
  protected isRetryableError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }
    
    const err = error as any;
    
    // Network errors (connection issues)
    const networkErrors = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'];
    if (networkErrors.includes(err.code)) {
      return true;
    }
    
    // HTTP 5xx server errors (retryable) vs 4xx client errors (not retryable)
    if (err.response?.status) {
      return err.response.status >= 500 && err.response.status < 600;
    }
    
    // Service-specific retryable error codes
    if (err.error_code) {
      const retryableCodes = ['RATE_LIMIT_EXCEEDED', 'INTERNAL_SERVER_ERROR', 'TIMEOUT'];
      return retryableCodes.includes(err.error_code);
    }
    
    return false;
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Generates unique request identifier for tracking
   */
  protected generateRequestId(): string {
    return `${this.serviceName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep utility for implementing delays
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validates that required configuration fields are present
   * 
   * @param requiredFields - Array of required field names
   * @throws Error if any required fields are missing
   */
  protected validateConfig(requiredFields: string[]): void {
    const missing = requiredFields.filter(field => 
      !this.config[field as keyof ServiceConfig]
    );
    
    if (missing.length > 0) {
      throw new Error(
        `Missing required configuration for ${this.serviceName}: ${missing.join(', ')}`
      );
    }
  }

  // ========================================================================
  // PUBLIC API
  // ========================================================================

  /**
   * Returns current service health and configuration status
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
