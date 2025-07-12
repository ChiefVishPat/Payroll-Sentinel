import { FastifyInstance } from 'fastify'
import { Company } from '@shared/types'
import { CheckService } from '@backend/services/check'
import { supabase } from '@backend/db/client'

/**
 * Registers company-related routes.
 * - POST /api/companies : Create a new company
 */
export default async function companyRoutes(fastify: FastifyInstance) {
  const checkService = fastify.services.checkService as CheckService;
  
  fastify.post('/companies', async (request, reply) => {
    const { name, ein, state } = request.body as Company;

    try {
      const result = await checkService.createCompany(name, ein, state)
      
      if (!result.success || !result.data) {
        fastify.log.error('Company creation failed:', result.error)
        reply.status(500).send({ error: result.error?.message || 'Unable to create company' })
        return
      }

      const { companyId } = result.data
      const { data, error: dbError } = await supabase
        .from('companies')
        .insert([{ name, ein, state, check_company_id: companyId }])
        .select()
        .single()

      if (dbError || !data) {
        fastify.log.error('Failed to persist company:', dbError)
        reply.status(500).send({ error: 'Unable to save company' })
        return
      }

      fastify.log.info(`Company created: ${companyId}`)
      reply.status(201).send(data)
    } catch (error) {
      fastify.log.error(error)
      reply.status(500).send({ error: 'Unable to create company' })
    }
  });
}
