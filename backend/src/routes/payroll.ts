import { FastifyInstance } from 'fastify';
import { supabase } from '../db/client';
import { CheckMockService } from '../services/checkMock';

export default async function payrollRoutes(fastify: FastifyInstance) {
  const check = new CheckMockService(fastify.log);

  fastify.post('/pay-schedule', async (req, reply) => {
    const { companyId } = req.body as any;
    const res = await check.createPaySchedule();
    await supabase.from('pay_schedules').insert({
      company_id: companyId,
      schedule_id: res.pay_schedule_id,
    });
    return reply.send({ payScheduleId: res.pay_schedule_id });
  });

  fastify.post('/payroll/run', async (req, reply) => {
    const { companyId } = req.body as any;
    const run = await check.runPayroll();
    await supabase.from('payroll_runs').insert({
      company_id: companyId,
      check_payroll_id: run.payroll_run_id,
      status: run.status,
    });
    return reply.send(run);
  });
}
