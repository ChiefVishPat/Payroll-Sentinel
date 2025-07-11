import fastify from 'fastify';
import cors from '@fastify/cors';
import { PlaidService } from './services/plaid';
import { CheckService } from './services/check';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

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
  environment: (process.env.PLAID_ENV as 'sandbox' | 'development' | 'production') || 'sandbox'
});

const checkService = new CheckService({
  apiKey: process.env.CHECK_API_KEY || 'demo-api-key',
  environment: (process.env.CHECK_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox'
});
// Logger children for external services
const plaidLog = server.log.child({ mod: 'Plaid' });
const checkLog = server.log.child({ mod: 'Check' });

// CORS
server.register(cors, {
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
});

// Health check
server.get('/health', async (request, reply) => {
  return { status: 'healthy', timestamp: new Date().toISOString() };
});

// Company routes
server.post('/api/companies', async (request, reply) => {
  const { name, ein, state } = request.body as any;
  try {
    const result = await checkService.createCompany(name, ein, state);
    if (!result.success || !result.data) {
      checkLog.error('Company creation failed:', result.error);
      return reply.status(500).send({ error: result.error?.message || 'Unable to create company' });
    }
    const { companyId } = result.data;
    checkLog.info(`Company created: ${companyId}`);
    return reply.send({ check_company_id: companyId });
  } catch (err) {
    checkLog.error(err);
    return reply.status(500).send({ error: 'Unable to create company' });
  }
});

// Banking routes
server.post('/api/banking/link-token', async (request, reply) => {
  const { userId = 'demo-user', companyId } = request.body as any;
  plaidLog.info(`creating link_token for user ${userId}`);
  try {
    const result = await plaidService.createLinkToken(userId, 'Payroll Demo');
    if (!result.success || !result.data) {
      plaidLog.error('link_token creation failed:', result.error);
      return reply.status(500).send({ success: false, error: result.error?.message });
    }
    plaidLog.info(`link_token created (${result.data.requestId})`);
    return reply.send({ success: true, linkToken: result.data.linkToken, expiration: result.data.expiration });
  } catch (err) {
    plaidLog.error(err);
    return reply.status(500).send({ success: false, error: 'Unable to create link token' });
  }
});

// Simple in-memory store for demo
const accessTokens = new Map<string, string>();

server.post('/api/banking/exchange', async (request, reply) => {
  const { publicToken, companyId } = request.body as any;
  plaidLog.info('exchanging public_token');
  try {
    const result = await plaidService.exchangePublicToken(publicToken);
    if (!result.success || !result.data) {
      plaidLog.error('public_token exchange failed:', result.error);
      return reply.status(500).send({ success: false, error: result.error?.message });
    }
    const { accessToken, itemId } = result.data;
    accessTokens.set(itemId, accessToken);
    plaidLog.info(`access_token stored for item ${itemId}`);
    return reply.send({ success: true, itemId, accessToken });
  } catch (err) {
    plaidLog.error(err);
    return reply.status(500).send({ success: false, error: 'Unable to exchange token' });
  }
});

server.post('/api/banking/simulate', async (request, reply) => {
  const { accessToken, amount, date, name } = request.body as any;
  plaidLog.info('simulating transaction');
  try {
    const result = await plaidService.simulateTransaction(accessToken, amount, date, name);
    if (!result.success) {
      plaidLog.error('sandbox simulation failed:', result.error);
      return reply.status(500).send({ success: false, error: result.error?.message });
    }
    plaidLog.info('sandbox transaction fired');
    return reply.send({ success: true });
  } catch (err) {
    plaidLog.error(err);
    return reply.status(500).send({ success: false, error: 'Unable to simulate transaction' });
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
      plaidLog.error('get balances failed:', result.error);
      return reply.status(500).send({ success: false, error: result.error?.message });
    }
    return reply.send({ success: true, balances: result.data });
  } catch (err) {
    plaidLog.error(err);
    return reply.status(500).send({ success: false, error: 'Unable to get balances' });
  }
});

// Payroll routes
server.post('/api/pay-schedule', async (request, reply) => {
  const { companyId, frequency, firstPayday } = request.body as any;
  try {
    const result = await checkService.createPaySchedule(companyId, frequency, firstPayday);
    if (!result.success || !result.data) {
      checkLog.error('Pay schedule creation failed:', result.error);
      return reply.status(500).send({ error: result.error?.message || 'Unable to schedule payroll' });
    }
    const { payScheduleId } = result.data;
    return reply.send({ success: true, payScheduleId });
  } catch (err) {
    checkLog.error(err);
    return reply.status(500).send({ error: 'Unable to schedule payroll' });
  }
});

server.post('/api/payroll/run', async (request, reply) => {
  const { companyId, payScheduleId } = request.body as any;
  try {
    const result = await checkService.runPayroll(companyId, payScheduleId);
    if (!result.success || !result.data) {
      checkLog.error('Payroll run failed:', result.error);
      return reply.status(500).send({ error: result.error?.message || 'Unable to run payroll' });
    }
    const { payrollRunId } = result.data;
    checkLog.info(`Payroll run initiated: ${payrollRunId}`);
    // Simulate polling for payroll status
    let status = 'pending';
    let attempts = 0;
    while (status !== 'paid' && attempts < 10) {
      await new Promise(res => setTimeout(res, 1000));
      const statusResponse = await checkService.getPayrollStatus(payrollRunId);
      if (statusResponse.success && statusResponse.data) {
        status = statusResponse.data.status;
      } else {
        break;
      }
      attempts++;
    }
    checkLog.info(`Payroll run completed: ${payrollRunId}`);
    return reply.send({ success: true, payrollRunId });
  } catch (err) {
    checkLog.error(err);
    return reply.status(500).send({ error: 'Unable to run payroll' });
  }
});

// Start server
const start = async () => {
  try {
    await server.listen({ port: 3001, host: '0.0.0.0' });
    server.log.info('🚀 Demo server started on http://localhost:3001');
    server.log.info('🎯 Access demo at: http://localhost:3000/demo/onboarding');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
