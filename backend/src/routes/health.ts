import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/client';

// Type definitions for health check responses
interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime?: number;
  version?: string;
  database?: string;
  message?: string;
}

interface ReadinessResponse {
  status: 'ready' | 'not ready';
  timestamp: string;
  reason?: string;
}

interface DetailedDbResponse {
  status: 'ok' | 'error';
  timestamp: string;
  database: {
    connected: boolean;
    url: string;
    error?: string;
    tableCount?: number;
  };
}

/**
 * Health check routes for monitoring service status
 * Provides endpoints for basic health, database connectivity, and readiness probes
 * @param fastify - Fastify instance to register routes with
 */
export const healthRoutes = async (fastify: FastifyInstance): Promise<void> => {
  /**
   * Basic health check endpoint
   * Returns service status, uptime, and version information
   * Always returns 200 OK if service is running
   */
  fastify.get<{ Reply: HealthResponse }>('/', async (_request: FastifyRequest, reply: FastifyReply): Promise<HealthResponse> => {
    const response: HealthResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(), // Server uptime in seconds
      version: '1.0.0',
    };
    
    return reply.send(response);
  });

  /**
   * Database health check endpoint
   * Tests database connectivity and returns detailed status
   * Returns 503 Service Unavailable if database is not accessible
   */
  fastify.get<{ Reply: HealthResponse }>('/db', async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      const isConnected: boolean = await db.testConnection();
      
      if (!isConnected) {
        const errorResponse: HealthResponse = {
          status: 'error',
          message: 'Database connection failed',
          timestamp: new Date().toISOString(),
        };
        return reply.status(503).send(errorResponse);
      }

      const successResponse: HealthResponse = {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
      return reply.send(successResponse);
    } catch (error) {
      // Log error for debugging while returning structured response
      fastify.log.error('Database health check failed:', error);
      
      const errorResponse: HealthResponse = {
        status: 'error',
        message: 'Database health check failed',
        timestamp: new Date().toISOString(),
      };
      return reply.status(503).send(errorResponse);
    }
  });

  /**
   * Detailed database information endpoint
   * Provides comprehensive database connection details for debugging
   */
  fastify.get<{ Reply: DetailedDbResponse }>('/db/info', async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      // Get detailed connection information
      const connectionInfo = await db.getConnectionInfo();
      
      const response: DetailedDbResponse = {
        status: connectionInfo.connected ? 'ok' : 'error',
        timestamp: new Date().toISOString(),
        database: connectionInfo,
      };
      
      // Return appropriate status code based on connection status
      const statusCode = connectionInfo.connected ? 200 : 503;
      return reply.status(statusCode).send(response);
    } catch (error) {
      fastify.log.error('Database info check failed:', error);
      
      const errorResponse: DetailedDbResponse = {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: {
          connected: false,
          url: 'unknown',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
      return reply.status(503).send(errorResponse);
    }
  });

  /**
   * Readiness probe endpoint (for Kubernetes/Docker health checks)
   * Indicates whether the service is ready to accept traffic
   * Checks all critical dependencies before marking as ready
   */
  fastify.get<{ Reply: ReadinessResponse }>('/ready', async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      // Check database connectivity as primary readiness indicator
      const isDbConnected: boolean = await db.testConnection();
      
      if (!isDbConnected) {
        const notReadyResponse: ReadinessResponse = {
          status: 'not ready',
          reason: 'database not connected',
          timestamp: new Date().toISOString(),
        };
        return reply.status(503).send(notReadyResponse);
      }

      // Service is ready to accept traffic
      const readyResponse: ReadinessResponse = {
        status: 'ready',
        timestamp: new Date().toISOString(),
      };
      return reply.send(readyResponse);
    } catch (error) {
      fastify.log.error('Readiness check failed:', error);
      
      const notReadyResponse: ReadinessResponse = {
        status: 'not ready',
        reason: 'readiness check failed',
        timestamp: new Date().toISOString(),
      };
      return reply.status(503).send(notReadyResponse);
    }
  });
};
