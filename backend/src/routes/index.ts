import { FastifyInstance } from 'fastify';
import cashFlowRoutes from './cashFlow.js';
import riskAssessmentRoutes from './riskAssessment.js';
import payrollRoutes from './payroll.js';
import bankingRoutes from './banking.js';
import notificationRoutes from './notifications.js';
import monitoringRoutes from './monitoring.js';
import jobRoutes from './jobs.js';
import mockDataRoutes from './mock-data.js';
import companiesRoutes from './companies.js';
import companyRoutes from './company.js';

/**
 * Register all API routes with a common prefix
 */
export async function registerRoutes(fastify: FastifyInstance) {
  // Add root route
  fastify.get('/', async (_request, _reply) => {
    return {
      message: 'Payroll Sentinel API',
      version: '1.0.0',
      docs: '/docs',
      health: '/health'
    };
  });
  
  // Register all routes with /api prefix
  await fastify.register(cashFlowRoutes, { prefix: '/api' });
  await fastify.register(riskAssessmentRoutes, { prefix: '/api' });
  await fastify.register(payrollRoutes, { prefix: '/api' });
  await fastify.register(bankingRoutes, { prefix: '/api' });
  await fastify.register(notificationRoutes, { prefix: '/api' });
  await fastify.register(monitoringRoutes, { prefix: '/api' });
  await fastify.register(jobRoutes, { prefix: '/api' });
  await fastify.register(mockDataRoutes, { prefix: '/api' });
  await fastify.register(companiesRoutes, { prefix: '/api' });
  await fastify.register(companyRoutes, { prefix: '/api' });
}

// Export individual route modules for selective usage
export {
  cashFlowRoutes,
  riskAssessmentRoutes,
  payrollRoutes,
  bankingRoutes,
  notificationRoutes,
  monitoringRoutes,
  jobRoutes,
  mockDataRoutes
};
