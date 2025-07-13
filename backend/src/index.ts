// @ts-nocheck
// Load environment variables before any other imports
import './loadEnv.js';

import fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';

import bankingRoutes from './routes/banking.js';
import companiesRoutes from './routes/companies.js';
import payrollRoutes from './routes/payroll.js';
import { CheckService } from './services/check.js';

// Environment variable warnings
if (process.env.NODE_ENV !== 'production') {
  if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
    console.warn('\x1b[33m%s\x1b[0m', 'Warning: PLAID_CLIENT_ID or PLAID_SECRET missing - using defaults');
  }
  if (!process.env.API_SECRET) {
    console.warn('\x1b[33m%s\x1b[0m', 'Warning: API_SECRET missing - using defaults');
  }
}

// Create Fastify instance with pretty logging
const server = fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  },
});

// Initialize core services and attach to Fastify instance
const checkService = new CheckService({
  apiKey: process.env.CHECK_API_KEY || '',
  environment:
    (process.env.CHECK_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
});
// @ts-ignore -- lightweight service container
server.decorate('services', { checkService });

// Register plugins
async function registerPlugins() {
  // CORS
  await server.register(cors, {
    origin: (origin: string | undefined, callback: () => void) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) {
        callback(null, true);
        return;
      }
      
      try {
        const url = new URL(origin);
        const hostname = url.hostname;
        
        // Allow requests from localhost for development (any port)
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          callback(null, true);
          return;
        }
        
        // Allow requests from your frontend domain
        if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
          callback(null, true);
          return;
        }
        
        callback(new Error("Not allowed by CORS"), false);
      } catch (error) {
        server.log.error('Invalid origin URL:', origin, error);
        callback(new Error("Invalid origin"), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-api-secret'],
  });
}

// Register routes
async function registerRoutes() {
  // Root route
  server.get('/', async () => {
    return {
      message: 'Payroll Sentinel API - Plaid Link MVP',
      version: '1.0.0',
      health: '/health'
    };
  });
  
  // Health check endpoint
  server.get('/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    const health = {
      status: 'healthy' as const,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        api: true,
        plaid: !!process.env.PLAID_CLIENT_ID && !!process.env.PLAID_SECRET,
      },
    };
    return reply.send(health);
  });
  
  // Register banking routes
  await server.register(bankingRoutes, { prefix: '/api' });
  // Register company onboarding routes
  await server.register(companiesRoutes, { prefix: '/api/companies' });

  // Register payroll routes
  await server.register(payrollRoutes, { prefix: '/api' });
}

// Error handler
server.setErrorHandler(async (error: unknown, _request: FastifyRequest, reply: FastifyReply) => {
  server.log.error(error);
  
  const statusCode = error.statusCode ?? 500;
  const message = statusCode >= 500 ? 'Internal Server Error' : error.message;
  
  await reply.status(statusCode).send({
    error: true,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  server.log.info(`Received ${signal}, shutting down gracefully`);
  
  try {
    await server.close();
    process.exit(0);
  } catch (error) {
    server.log.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const start = async () => {
  try {
    await registerPlugins();
    await registerRoutes();
    
    const port = Number(process.env.PORT) || 3001;
    const host = process.env.HOST || '0.0.0.0';
    
    await server.listen({ port, host });
    
    server.log.info(`Server listening on ${host}:${port}`);
    server.log.info(`Health check available at http://${host}:${port}/health`);
    server.log.info(`API endpoints available at http://${host}:${port}/api`);
    
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

start().catch(error => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
// @ts-nocheck
