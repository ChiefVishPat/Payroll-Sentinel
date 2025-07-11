import { FastifyInstance } from 'fastify';
import { Company } from '../types/shared';
import { CheckService } from '../services/check.js';

/**
 * Registers company-related routes.
 * - POST /api/companies : Create a new company
 */
export default async function companyRoutes(fastify: FastifyInstance) {
  const checkService = fastify.services.checkService as CheckService;
  
  fastify.post('/companies', async (request, reply) => {
    const { name, ein, state } = request.body as Company;
    
    try {
      const result = await checkService.createCompany(name, ein, state);
      
      if (!result.success || !result.data) {
        fastify.log.error('Company creation failed:', result.error);
        reply.status(500).send({ error: result.error?.message || 'Unable to create company' });
        return;
      }
      
      const { companyId } = result.data;
      fastify.log.info(`Company created: ${companyId}`);
      reply.send({ check_company_id: companyId });
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Unable to create company' });
    }
  });
}
