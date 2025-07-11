// @ts-nocheck
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

/**
 * Standard API response format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  timestamp: string;
  requestId: string;
}

/**
 * Error types for consistent error handling
 */
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR'
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public type: ErrorType,
    override message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Generate unique request ID for tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Add request ID to all requests for traceability
 */
const requestIdMiddleware = async (request: FastifyRequest, reply: FastifyReply) => {
  const requestId = generateRequestId();
  request.requestId = requestId;
  reply.header('X-Request-ID', requestId);
};

/**
 * Log all incoming requests with timing
 */
const requestLoggingMiddleware = async (request: FastifyRequest, reply: FastifyReply) => {
  const start = Date.now();
  
  request.log.info({
    requestId: request.requestId,
    method: request.method,
    url: request.url,
    userAgent: request.headers['user-agent'],
    ip: request.ip
  }, 'Incoming request');
  
  // Log response timing when request completes
  reply.raw.on('finish', () => {
    const duration = Date.now() - start;
    request.log.info({
      requestId: request.requestId,
      statusCode: reply.statusCode,
      duration: `${duration}ms`
    }, 'Request completed');
  });
};

/**
 * Basic authentication middleware (API key based)
 */
const authenticationMiddleware = async (request: FastifyRequest, _reply: FastifyReply) => {
  // Skip auth for health check endpoints
  if (request.url === '/health' || request.url.startsWith('/health/')) {
    return;
  }
  
  // Skip authentication in development mode
  if (process.env.NODE_ENV !== 'production') {
    return;
  }
  
  const apiKey = request.headers['x-api-key'] as string;
  const authHeader = request.headers.authorization;
  
  // Check for API key
  if (apiKey) {
    const expectedApiKey = process.env.API_KEY;
    if (!expectedApiKey || apiKey !== expectedApiKey) {
      throw new ApiError(
        ErrorType.AUTHENTICATION_ERROR,
        'Invalid API key',
        401
      );
    }
    return;
  }
  
  // Check for Bearer token
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    // In a real app, you'd validate the JWT token here
    // For now, we'll just check if it exists
    if (!token) {
      throw new ApiError(
        ErrorType.AUTHENTICATION_ERROR,
        'Invalid bearer token',
        401
      );
    }
    return;
  }
  
  // No valid authentication found
  throw new ApiError(
    ErrorType.AUTHENTICATION_ERROR,
    'Missing authentication credentials',
    401
  );
};

/**
 * Rate limiting middleware (simple in-memory implementation)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const rateLimitMiddleware = async (request: FastifyRequest, _reply: FastifyReply) => {
  const key = request.ip;
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 100; // requests per minute
  
  const now = Date.now();
  const record = rateLimitMap.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return;
  }
  
  if (record.count >= maxRequests) {
    throw new ApiError(
      ErrorType.RATE_LIMIT_ERROR,
      'Rate limit exceeded',
      429,
      { limit: maxRequests, windowMs }
    );
  }
  
  record.count++;
};

/**
 * Global error handler for consistent error responses
 */
export const errorHandler = async (
  error: any,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const requestId = request.requestId || 'unknown';
  
  // Handle our custom API errors
  if (error instanceof ApiError) {
    const response: ApiResponse = {
      success: false,
      error: {
        message: error.message,
        code: error.type,
        details: error.details
      },
      timestamp: new Date().toISOString(),
      requestId
    };
    
    request.log.warn({
      requestId,
      errorType: error.type,
      message: error.message,
      statusCode: error.statusCode
    }, 'API Error');
    
    return reply.status(error.statusCode).send(response);
  }
  
  // Handle Fastify validation errors
  if (error.validation) {
    const response: ApiResponse = {
      success: false,
      error: {
        message: 'Validation failed',
        code: ErrorType.VALIDATION_ERROR,
        details: error.validation
      },
      timestamp: new Date().toISOString(),
      requestId
    };
    
    request.log.warn({
      requestId,
      validation: error.validation
    }, 'Validation Error');
    
    return reply.status(400).send(response);
  }
  
  // Handle unexpected errors
  request.log.error({
    requestId,
    error: error.message,
    stack: error.stack
  }, 'Unexpected Error');
  
  const response: ApiResponse = {
    success: false,
    error: {
      message: 'An unexpected error occurred',
      code: ErrorType.INTERNAL_ERROR
    },
    timestamp: new Date().toISOString(),
    requestId
  };
  
  return reply.status(500).send(response);
};

/**
 * Success response formatter
 */
export const formatSuccessResponse = <T>(
  data: T,
  requestId: string
): ApiResponse<T> => {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    requestId
  };
};

/**
 * Middleware plugin to register all middleware
 */
const middlewarePlugin = fp(async (fastify: FastifyInstance) => {
  // Add request ID to all requests
  fastify.addHook('onRequest', requestIdMiddleware);
  
  // Add request logging
  fastify.addHook('onRequest', requestLoggingMiddleware);
  
  // Add rate limiting
  fastify.addHook('onRequest', rateLimitMiddleware);
  
  // Add authentication (can be overridden per route)
  fastify.addHook('onRequest', authenticationMiddleware);
  
  // Set global error handler
  fastify.setErrorHandler(errorHandler);
  
// @ts-nocheck
  // Add CORS headers
  fastify.addHook('onRequest', async (request, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    
    if (request.method === 'OPTIONS') {
      reply.status(200).send();
    }
  });
});

// Extend FastifyRequest interface to include requestId
declare module 'fastify' {
  interface FastifyRequest {
    requestId?: string;
  }
}

export default middlewarePlugin;
// @ts-nocheck
