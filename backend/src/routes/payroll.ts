import { FastifyInstance } from 'fastify'
import { supabase } from '../db/client'
import { CheckMockService } from '../services/checkMock'
import { PlaidService } from '../services/plaid'
import { SlackService } from '../services/slack'

export default async function payrollRoutes(fastify: FastifyInstance) {
  const checkLog = fastify.log.child({ mod: 'CheckMock' })
  const supaLog = fastify.log.child({ mod: 'Supabase' })
  const plaidLog = fastify.log.child({ mod: 'Plaid' })
  const check = new CheckMockService()
  const plaid = fastify.services?.plaidService as PlaidService
  const slack = fastify.services?.slackService as SlackService

  fastify.post('/pay-schedule', async (request, reply) => {
    const { companyId } = request.body as { companyId: string }
    checkLog.info('create pay schedule')
    const { pay_schedule_id } = await check.createPaySchedule()
    const { error } = await supabase.from('pay_schedules').insert({ company_id: companyId, pay_schedule_id })
    if (error) supaLog.error({ err: error }, 'failed to save schedule')
    return reply.send({ payScheduleId: pay_schedule_id })
  })

  fastify.post('/payroll/run', async (request, reply) => {
    const { companyId, itemId, payScheduleId } = request.body as { companyId: string; itemId: string; payScheduleId: string }
    checkLog.info('run payroll')
    const run = await check.runPayroll()
    await supabase.from('payroll_runs').insert({ company_id: companyId, check_payroll_id: run.payroll_run_id, pay_date: new Date().toISOString(), total_amount: 1000, status: run.status })
    plaidLog.info('simulate payroll debit')
    const { data } = await supabase.from('company_bank').select('access_token').eq('item_id', itemId).single()
    if (data?.access_token) {
      await plaid.simulateTransaction(data.access_token, -1000, new Date().toISOString().split('T')[0], 'Payroll Debit')
    }
    if (slack) {
      await slack.sendNotification('Payroll', 'Payroll run complete')
    }
    return reply.send(run)
  })
}
