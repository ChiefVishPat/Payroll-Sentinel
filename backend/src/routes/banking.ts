// @ts-nocheck
import { FastifyInstance } from 'fastify'
import { supabase } from '../db/client'
import { PlaidService } from '../services/plaid'

const accessTokens = new Map<string, string>()

export default async function bankingRoutes(fastify: FastifyInstance) {
  const { PLAID_CLIENT_ID, PLAID_SECRET } = process.env
  if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
    fastify.log.warn('PLAID_* env vars missing – banking routes disabled')
    return
  }

  const plaidLog = fastify.log.child({ mod: 'Plaid' })
  const supaLog = fastify.log.child({ mod: 'Supabase' })
  const plaid = new PlaidService({
    clientId: PLAID_CLIENT_ID,
    secret: PLAID_SECRET,
    environment: 'sandbox'
  })

  fastify.post('/banking/link-token', async (req, reply) => {
    const { userId = 'demo-user' } = req.body as { userId?: string }
    plaidLog.info('create link token')
    const res = await plaid.createLinkToken(userId, 'Payroll Demo')
    if (!res.success || !res.data) return reply.status(500).send({ error: res.error?.message })
    return reply.send({ linkToken: res.data.linkToken, expiration: res.data.expiration })
  })

  fastify.post('/banking/exchange-token', async (req, reply) => {
    const { publicToken, companyId } = req.body as { publicToken: string; companyId: string }
    plaidLog.info('exchange public token')
    const ex = await plaid.exchangePublicToken(publicToken)
    if (!ex.success || !ex.data) return reply.status(500).send({ error: ex.error?.message })
    const { accessToken, itemId } = ex.data
    accessTokens.set(itemId, accessToken)
    const { error } = await supabase.from('company_bank').upsert({ company_id: companyId, item_id: itemId, access_token: accessToken })
    if (error) supaLog.error({ err: error }, 'db upsert failed')
    plaidLog.info(`stored item ${itemId}`)
    return reply.send({ itemId })
  })

  fastify.get('/banking/balances', async (req, reply) => {
    const { itemId } = req.query as { itemId: string }
    let accessToken = accessTokens.get(itemId)
    if (!accessToken) {
      const { data } = await supabase.from('company_bank').select('access_token').eq('item_id', itemId).single()
      accessToken = data?.access_token
    }
    if (!accessToken) return reply.status(400).send({ error: 'unknown item' })
    const bal = await plaid.getBalances(accessToken)
    if (!bal.success || !bal.data) return reply.status(500).send({ error: bal.error?.message })
    return reply.send(bal.data)
  })
}
