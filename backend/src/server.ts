// @ts-nocheck
import fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import winston from 'winston';
import * as dotenvFlow from 'dotenv-flow';
import path from 'path';
import { registerRoutes } from './routes/index.js';
// import middlewarePlugin, { errorHandler } from './middleware';
import { JobScheduler } from './services/jobScheduler.js';
import { RiskEngine } from './services/riskEngine.js';
import { PlaidService } from './services/plaid.js';
import { CheckService } from './services/check.js';
import { SlackService } from './services/slack.js';

// Load environment variables from project root .env files
dotenvFlow.config({ path: path.resolve(__dirname, '../..') });

// Initialize database service
import { initializeDatabase } from './config/database.js';
initializeDatabase();

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Initialize services with environment variable warnings
if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
  console.warn('\x1b[33m%s\x1b[0m', 'Warning: PLAID_CLIENT_ID or PLAID_SECRET missing - using defaults');
}
if (!process.env.API_SECRET) {
  console.warn('\x1b[33m%s\x1b[0m', 'Warning: API_SECRET missing - using defaults');
}

const plaidService = new PlaidService({
  clientId: process.env.PLAID_CLIENT_ID || 'default-client-id',
  secret: process.env.PLAID_SECRET || 'default-secret',
  environment: (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production'
});

const checkService = new CheckService({
  apiKey: process.env.CHECK_API_KEY || 'demo-api-key',
  environment: 'sandbox'
});

const slackService = new SlackService({
  botToken: process.env.SLACK_BOT_TOKEN || 'default-bot-token',
  channelId: process.env.SLACK_CHANNEL_ID || 'default-channel-id',
  environment: (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production'
});

const riskEngine = new RiskEngine(
  {
    safetyMarginPercent: parseFloat(process.env.RISK_SAFETY_MARGIN || '20'),
    criticalThresholdDays: parseInt(process.env.RISK_CRITICAL_THRESHOLD_DAYS || '3'),
    warningThresholdDays: parseInt(process.env.RISK_WARNING_THRESHOLD_DAYS || '7'),
    environment: (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production'
  },
  plaidService,
  checkService,
  slackService
);

const jobScheduler = new JobScheduler(
  {
    riskAssessmentInterval: parseInt(process.env.RISK_ASSESSMENT_INTERVAL || '60'),
    dataRefreshInterval: parseInt(process.env.DATA_REFRESH_INTERVAL || '30'),
    alertCheckInterval: parseInt(process.env.ALERT_CHECK_INTERVAL || '15'),
    enableAutoAlerts: process.env.ENABLE_AUTO_ALERTS === 'true',
    maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '5'),
    environment: (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production'
  },
  riskEngine,
  plaidService,
  checkService,
  slackService
);

// Create Fastify instance
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

// Register plugins
async function registerPlugins() {
  // Security
  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  });

  // CORS
  await server.register(cors, {
    origin: (origin, callback) => {
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
        logger.error('Invalid origin URL:', origin, error);
        callback(new Error("Invalid origin"), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Rate limiting
  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });
}

// Register routes
async function registerRoutesForServer() {
  // Decorate server with services to make them available in routes
  server.decorate('services', {
    plaidService,
    checkService,
    slackService,
    riskEngine,
    jobScheduler
  });
  
  await server.register(registerRoutes);
}

// Error handler
import { errorHandler } from './middleware/index.js';
server.setErrorHandler(errorHandler);

// Health check endpoint
server.get('/health', async (request, reply) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    services: {
      api: true,
      database: true, // Will be checked when services are properly initialized
    },
  };

  return reply.send(health);
});

// Graceful shutdown
async function gracefulShutdown() {
  logger.info('Shutting down server...');
  
  try {
    await server.close();
    logger.info('Server shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
async function start() {
  try {
    await registerPlugins();
    await registerRoutesForServer();
    
    const port = Number(process.env.PORT) || 3001;
    const host = process.env.HOST || '0.0.0.0';
    
    await server.listen({ port, host });
    
    logger.info(`Server listening on ${host}:${port}`);
    logger.info(`Health check available at http://${host}:${port}/health`);
    logger.info(`API endpoints available at http://${host}:${port}/api`);
    
    // Start background services (disabled for now)
    if (process.env.ENABLE_BACKGROUND_JOBS === 'true') {
      logger.info('Starting background job scheduler...');
      try {
        await jobScheduler.initialize();
      } catch (error) {
        logger.warn('Background job scheduler failed to start:', error);
      }
    }
    
    logger.info('Server started successfully');
    
  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
}

// Start the server
start();

export { server };
// @ts-nocheck
