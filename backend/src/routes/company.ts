import { FastifyInstance } from 'fastify'
import { supabase } from '../db/client'
import { CheckMockService } from '../services/checkMock'

/**
 * Company onboarding routes
 */
export default async function companyRoutes(fastify: FastifyInstance) {
  const supaLog = fastify.log.child({ mod: 'Supabase' })
  const checkLog = fastify.log.child({ mod: 'CheckMock' })
  const check = new CheckMockService()

  fastify.post('/companies', async (request, reply) => {
    const { name, ein, state } = request.body as { name: string; ein: string; state: string }

    checkLog.info('create company')
    const { company_id } = await check.createCompany()
    supaLog.info(`inserting company ${company_id}`)

    const { error } = await supabase.from('companies').insert({
      name,
      ein,
      state,
      check_company_id: company_id
    })

    if (error) {
      supaLog.error({ err: error }, 'failed to insert company')
      return reply.status(500).send({ error: 'database error' })
    }

    return reply.send({ companyId: company_id })
  })
}
