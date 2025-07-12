import { FastifyInstance } from 'fastify'
import { CheckService } from '@backend/services/check'
import { supabase } from '@backend/db/client'
import fs from 'fs'

/**
 * Payroll routes for managing payroll operations
 * Includes creating pay schedules and running payroll
 */
export default async function payrollRoutes(fastify: FastifyInstance) {
  const checkService = fastify.services.checkService as CheckService

  /** Ensure required tables exist. */
  async function ensureSchema() {
    try {
      await supabase.from('employees').select('id').limit(1)
    } catch (err: any) {
      if (err?.message?.includes('relation') || err?.code === '42P01') {
        await supabase.rpc('execute_sql', {
          sql: `create table if not exists employees (
            id uuid primary key default uuid_generate_v4(),
            company_id uuid references companies(id) on delete cascade,
            name text,
            title text,
            salary numeric,
            status text,
            created_at timestamp with time zone default now(),
            updated_at timestamp with time zone default now()
          );`
        })
        fs.appendFileSync(
          'backend/logs/SCHEMA_CHANGES.md',
          `- ${new Date().toISOString()} created employees table\n`
        )
      }
    }
    try {
      await supabase.from('pay_schedules').select('id').limit(1)
    } catch (err: any) {
      if (err?.message?.includes('relation') || err?.code === '42P01') {
        await supabase.rpc('execute_sql', {
          sql: `create table if not exists pay_schedules (
            id uuid primary key default uuid_generate_v4(),
            company_id uuid references companies(id) on delete cascade,
            frequency text,
            next_run_date date,
            created_at timestamp with time zone default now(),
            updated_at timestamp with time zone default now()
          );`
        })
        fs.appendFileSync(
          'backend/logs/SCHEMA_CHANGES.md',
          `- ${new Date().toISOString()} created pay_schedules table\n`
        )
      }
    }
  }

  /**
   * Schedule payroll for a company
   * @route POST /api/pay-schedule
   */
  fastify.post('/pay-schedule', async (request, reply) => {
    const { companyId, frequency, firstPayday } = request.body;

    try {
      const result = await checkService.createPaySchedule(companyId, frequency, firstPayday);
      
      if (!result.success || !result.data) {
        fastify.log.error('Pay schedule creation failed:', result.error);
        reply.status(500).send({ error: result.error?.message || 'Unable to schedule payroll' });
        return;
      }
      
      const { payScheduleId } = result.data;
      reply.send({ success: true, payScheduleId });
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Unable to schedule payroll' });
    }
  });

  /**
   * Run payroll for a given pay schedule
   * @route POST /api/payroll/run
   */
  fastify.post('/payroll/run', async (request, reply) => {
    const { companyId, payScheduleId } = request.body;

    try {
      const result = await checkService.runPayroll(companyId, payScheduleId);
      
      if (!result.success || !result.data) {
        fastify.log.error('Payroll run failed:', result.error);
        reply.status(500).send({ error: result.error?.message || 'Unable to run payroll' });
        return;
      }
      
      const { payrollRunId } = result.data;
      fastify.log.info(`Payroll run initiated: ${payrollRunId}`);
      
      // Simulate polling for payroll status
      let status = 'pending';
      while (status !== 'paid') {
        await new Promise(res => setTimeout(res, 2000)); // simulate delay
        const statusResponse = await checkService.getPayrollStatus(payrollRunId);
        if (statusResponse.success && statusResponse.data) {
          status = statusResponse.data.status;
        } else {
          break; // Exit if status check fails
        }
      }

      fastify.log.info(`Payroll run completed: ${payrollRunId}`);
      reply.send({ success: true, payrollRunId });
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Unable to run payroll' });
    }
  });

  /**
   * Get payroll summary for dashboard
   * @route GET /api/payroll/summary
   */
  fastify.get('/payroll/summary', async (request, reply) => {
    const start = Date.now()
    const { companyId } = request.query as { companyId: string }
    await ensureSchema()
    try {
      const { data: empRows } = await supabase
        .from('employees')
        .select('salary')
        .eq('company_id', companyId)

      const { data: scheduleRows } = await supabase
        .from('pay_schedules')
        .select('next_run_date')
        .eq('company_id', companyId)
        .order('next_run_date', { ascending: true })
        .limit(1)

      const { data: runRows } = await supabase
        .from('payroll_runs')
        .select('status')
        .eq('company_id', companyId)

      const totalEmployees = empRows?.length || 0
      const monthlyPayroll =
        (empRows?.reduce((t, e) => t + Number(e.salary || 0), 0) || 0) / 12
      const nextPayroll = scheduleRows?.[0]?.next_run_date || null
      const pendingRuns = runRows?.filter(r => r.status === 'pending').length || 0

      fastify.log.info({ mod: 'Payroll' }, 'summary fetched in %d ms', Date.now() - start)
      return reply.send({ totalEmployees, monthlyPayroll, nextPayroll, pendingRuns })
    } catch (error) {
      fastify.log.error({ mod: 'Payroll' }, 'summary error %o', error)
      return reply.status(500).send({ error: 'failed to fetch summary' })
    }
  })

  /**
   * Get payroll runs
   * @route GET /api/payroll/runs
   */
  fastify.get('/payroll/runs', async (request, reply) => {
    const { companyId } = request.query as { companyId: string }
    await ensureSchema()
    try {
      const { data, error } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('company_id', companyId)
        .order('pay_date', { ascending: false })
      if (error) throw error
      fastify.log.info({ mod: 'Payroll' }, 'runs fetched')
      return reply.send({ data })
    } catch (err) {
      fastify.log.error({ mod: 'Payroll' }, 'runs error %o', err)
      return reply.status(500).send({ error: 'failed to fetch runs' })
    }
  })

  /**
   * Get employees
   * @route GET /api/payroll/employees
   */
  fastify.get('/payroll/employees', async (request, reply) => {
    const { companyId } = request.query as { companyId: string }
    await ensureSchema()
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true })
      if (error) throw error
      fastify.log.info({ mod: 'Payroll' }, 'employees fetched')
      return reply.send({ data })
    } catch (err) {
      fastify.log.error({ mod: 'Payroll' }, 'employees error %o', err)
      return reply.status(500).send({ error: 'failed to fetch employees' })
    }
  })
}

