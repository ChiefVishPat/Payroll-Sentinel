import './loadEnv.js';

import fastify from 'fastify';
import cors from '@fastify/cors';
import { PlaidService } from './services/plaid';
import { CheckService } from './services/check';

// Create Fastify instance
const server = fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  },
});

// Services
const plaidService = new PlaidService({
  clientId: process.env.PLAID_CLIENT_ID || 'demo-client-id',
  secret: process.env.PLAID_SECRET || 'demo-secret',
  environment: 'sandbox'
});

const checkService = new CheckService({
  apiKey: process.env.CHECK_API_KEY || 'demo-api-key',
  environment: 'sandbox'
});

// CORS
server.register(cors, {
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
});

// Health check
server.get('/health', async (request, reply) => {
  return { status: 'healthy', timestamp: new Date().toISOString() };
});

// Simple in-memory store for demo
const accessTokens = new Map<string, string>();

// Banking routes
server.post('/api/banking/link-token', async (request, reply) => {
  const { userId = 'demo-user', companyId } = request.body as any;
  server.log.info(`Plaid: creating link_token for user ${userId}`);
  
  try {
    const result = await plaidService.createLinkToken(userId, 'Payroll Demo');
    
    if (!result.success || !result.data) {
      server.log.error('Plaid: link_token creation failed:', result.error);
      return reply.status(500).send({ success: false, error: result.error?.message });
    }
    
    server.log.info(`Plaid: link_token created (${result.data.requestId})`);
    return reply.send({ success: true, linkToken: result.data.linkToken, expiration: result.data.expiration });
  } catch (error) {
    server.log.error('Error creating link token:', error);
    return reply.status(500).send({ success: false, error: 'Unable to create link token' });
  }
});

server.post('/api/banking/exchange-token', async (request, reply) => {
  const { publicToken, companyId } = request.body as any;
  server.log.info('Plaid: exchanging public_token');
  
  try {
    const result = await plaidService.exchangePublicToken(publicToken);
    
    if (!result.success || !result.data) {
      server.log.error('Plaid: public_token exchange failed:', result.error);
      return reply.status(500).send({ success: false, error: result.error?.message });
    }
    
    const { accessToken, itemId } = result.data;
    accessTokens.set(itemId, accessToken);
    server.log.info(`Plaid: access_token stored for item ${itemId}`);
    
    return reply.send({ success: true, itemId, accessToken });
  } catch (error) {
    server.log.error('Error exchanging token:', error);
    return reply.status(500).send({ success: false, error: 'Unable to exchange token' });
  }
});

// Also support the legacy endpoint
server.post('/api/banking/exchange', async (request, reply) => {
  const { publicToken, companyId } = request.body as any;
  server.log.info('Plaid: exchanging public_token (legacy endpoint)');
  
  try {
    const result = await plaidService.exchangePublicToken(publicToken);
    
    if (!result.success || !result.data) {
      server.log.error('Plaid: public_token exchange failed:', result.error);
      return reply.status(500).send({ success: false, error: result.error?.message });
    }
    
    const { accessToken, itemId } = result.data;
    accessTokens.set(itemId, accessToken);
    server.log.info(`Plaid: access_token stored for item ${itemId}`);
    
    return reply.send({ success: true, itemId, accessToken });
  } catch (error) {
    server.log.error('Error exchanging token:', error);
    return reply.status(500).send({ success: false, error: 'Unable to exchange token' });
  }
});

server.get('/api/banking/balances', async (request, reply) => {
  const { itemId } = request.query as any;
  const accessToken = accessTokens.get(itemId);
  
  if (!accessToken) {
    return reply.status(400).send({ success: false, error: 'Unknown itemId' });
  }
  
  try {
    const result = await plaidService.getBalances(accessToken);
    
    if (!result.success || !result.data) {
      server.log.error('Plaid: get balances failed:', result.error);
      return reply.status(500).send({ success: false, error: result.error?.message });
    }
    
    return reply.send({ success: true, balances: result.data });
  } catch (error) {
    server.log.error('Error getting balances:', error);
    return reply.status(500).send({ success: false, error: 'Unable to get balances' });
  }
});

// Mock endpoints for the regular frontend
server.get('/api/banking/accounts', async (request, reply) => {
  return reply.send({ data: [], success: true });
});

server.get('/api/banking/transactions', async (request, reply) => {
  return reply.send({ data: [], success: true });
});

server.get('/api/banking/status', async (request, reply) => {
  return reply.send({ 
    data: { 
      connected: false, 
      lastSync: null, 
      accountCount: 0, 
      status: 'disconnected' 
    }, 
    success: true 
  });
});

server.post('/api/banking/refresh', async (request, reply) => {
  return reply.send({ success: true });
});

// Start server
const start = async () => {
  try {
    await server.listen({ port: 3001, host: '0.0.0.0' });
    server.log.info('🚀 Standalone demo server started on http://localhost:3001');
    server.log.info('🎯 Ready to test Plaid Link integration');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
