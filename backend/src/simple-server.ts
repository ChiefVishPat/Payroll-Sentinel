// @ts-nocheck
// Load environment variables before other imports
import './loadEnv.js';

import fastify from 'fastify';

// Create Fastify instance
const server = fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// Simple health check endpoint
server.get('/health', async (request, reply) => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
  };
});

// Start server
async function start() {
  try {
    const port = Number(process.env.PORT) || 3001;
    const host = process.env.HOST || '0.0.0.0';
    
    await server.listen({ port, host });
    
    console.log(`Server listening on ${host}:${port}`);
    
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

start();
