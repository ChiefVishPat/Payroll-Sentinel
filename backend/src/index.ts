import 'dotenv-flow/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { db } from './db/client';
import { companiesRoutes } from './routes/companies';
import { healthRoutes } from './routes/health';

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
  },
});

// Error handler
fastify.setErrorHandler(async (error, _request, reply) => {
  fastify.log.error(error);
  
  const statusCode = error.statusCode ?? 500;
  const message = statusCode >= 500 ? 'Internal Server Error' : error.message;
  
  await reply.status(statusCode).send({
    error: true,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
  });
});

// Register plugins
async function registerPlugins(): Promise<void> {
  // CORS
  await fastify.register(cors, {
    origin: process.env.NODE_ENV === 'production' ? false : true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  });

  // Swagger documentation
  await fastify.register(swagger, {
    swagger: {
      info: {
        title: 'Warp Sentinel API',
        description: 'API for Warp Sentinel payroll cash flow monitoring',
        version: '1.0.0',
      },
      host: process.env.NODE_ENV === 'production' ? 'api.warpsentinel.com' : 'localhost:3001',
      schemes: [process.env.NODE_ENV === 'production' ? 'https' : 'http'],
      consumes: ['application/json'],
      produces: ['application/json'],
      securityDefinitions: {
        apiKey: {
          type: 'apiKey',
          name: 'x-api-secret',
          in: 'header',
        },
      },
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });
}

// Register routes
async function registerRoutes(): Promise<void> {
  await fastify.register(healthRoutes, { prefix: '/health' });
  await fastify.register(companiesRoutes, { prefix: '/api/companies' });
}

// Hooks
fastify.addHook('preHandler', async (request, reply) => {
  // Skip auth for health and docs endpoints
  if (request.url.startsWith('/health') || request.url.startsWith('/docs')) {
    return;
  }

  // Simple API secret validation for demo
  const apiSecret = request.headers['x-api-secret'] as string;
  const expectedSecret = process.env.API_SECRET;

  if (!expectedSecret) {
    fastify.log.warn('API_SECRET not configured');
    return;
  }

  if (!apiSecret || apiSecret !== expectedSecret) {
    await reply.status(401).send({
      error: true,
      message: 'Unauthorized',
      statusCode: 401,
    });
  }
});

// Graceful shutdown
const gracefulShutdown = async (signal: string): Promise<void> => {
  fastify.log.info(`Received ${signal}, shutting down gracefully`);
  
  try {
    await fastify.close();
    process.exit(0);
  } catch (error) {
    fastify.log.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const start = async (): Promise<void> => {
  try {
    // Test database connection
    const dbConnected = await db.testConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }
    fastify.log.info('Database connection established');

    // Register plugins and routes
    await registerPlugins();
    await registerRoutes();

    // Start listening
    const port = parseInt(process.env.PORT ?? '3001', 10);
    const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

    await fastify.listen({ port, host });
    fastify.log.info(`Server listening on ${host}:${port}`);
    fastify.log.info(`Swagger documentation available at http://${host}:${port}/docs`);
  } catch (error) {
    fastify.log.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  fastify.log.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

start().catch(error => {
  fastify.log.error('Failed to start application:', error);
  process.exit(1);
});
