import { FastifyInstance } from 'fastify'
import { CheckService } from '@backend/services/check'
import { supabase } from '@backend/db/client'
import fs from 'fs'

/**
 * Payroll routes for managing payroll operations
 * Includes creating pay schedules and running payroll
 */
export default async function payrollRoutes(fastify: FastifyInstance) {
  const checkService = (fastify as any).services?.checkService
    ? (fastify as any).services.checkService as CheckService
    : new CheckService({
        apiKey: process.env.CHECK_API_KEY || '',
        environment:
          (process.env.CHECK_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
      })

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
            department text,
            start_date date,
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
      await supabase.from('employees').select('department').limit(1)
    } catch (err: any) {
      if (err?.message?.includes('column') || err?.code === '42703') {
        await supabase.rpc('execute_sql', {
          sql: 'alter table employees add column if not exists department text;'
        })
        fs.appendFileSync(
          'backend/logs/SCHEMA_CHANGES.md',
          `- ${new Date().toISOString()} added employees.department column\n`
        )
      }
    }
    try {
      await supabase.from('employees').select('start_date').limit(1)
    } catch (err: any) {
      if (err?.message?.includes('column') || err?.code === '42703') {
        await supabase.rpc('execute_sql', {
          sql: 'alter table employees add column if not exists start_date date;'
        })
        fs.appendFileSync(
          'backend/logs/SCHEMA_CHANGES.md',
          `- ${new Date().toISOString()} added employees.start_date column\n`
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
    const { companyId, payScheduleId } = request.body as {
      companyId: string;
      payScheduleId?: string;
    };

    await ensureSchema();

    try {
      let scheduleId = payScheduleId;
      if (!scheduleId) {
        const { data } = await supabase
          .from('pay_schedules')
          .select('id')
          .eq('company_id', companyId)
          .order('created_at', { ascending: true })
          .limit(1)
          .single();
        if (!data) {
          return reply
            .status(400)
            .send({ error: 'No pay schedule found for company' });
        }
        scheduleId = data.id as string;
      }

      const result = await checkService.runPayroll(companyId, scheduleId);
      
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

      // Persist basic run record for demo purposes
      await supabase.from('payroll_runs').insert({
        company_id: companyId,
        check_payroll_id: payrollRunId,
        pay_date: new Date().toISOString().split('T')[0],
        total_amount: 0,
        status,
      });

      reply.send({ success: true, payrollRunId, status });
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

  /**
   * Add a new employee
   * @route POST /api/payroll/employees
   */
  fastify.post('/payroll/employees', async (request, reply) => {
    const {
      companyId,
      name,
      title,
      salary,
      status,
      department,
      startDate,
    } = request.body as any

    await ensureSchema()

    try {
      const { error } = await supabase.from('employees').insert({
        company_id: companyId,
        name,
        title,
        salary,
        status,
        department,
        start_date: startDate,
      })
      if (error) throw error
      fastify.log.info({ mod: 'Payroll' }, 'employee added')
      await reply.send({ success: true })
    } catch (err) {
      fastify.log.error({ mod: 'Payroll' }, 'add employee error %o', err)
      return reply.status(500).send({ error: 'failed to add employee' })
    }
  })

  /**
   * Approve a payroll run
   * @route POST /api/payroll/runs/:runId/approve
   */
  fastify.post('/payroll/runs/:runId/approve', async (request, reply) => {
    const { runId } = request.params as { runId: string }
    const { companyId } = request.body as { companyId: string }

    try {
      const { error } = await supabase
        .from('payroll_runs')
        .update({ status: 'approved' })
        .eq('id', runId)
        .eq('company_id', companyId)

      if (error) throw error
      fastify.log.info({ mod: 'Payroll' }, 'run approved')
      return reply.send({ success: true })
    } catch (err) {
      fastify.log.error({ mod: 'Payroll' }, 'approve run error %o', err)
      return reply.status(500).send({ error: 'failed to approve run' })
    }
  })

  /**
   * Process a payroll run
   * @route POST /api/payroll/runs/:runId/process
   */
  fastify.post('/payroll/runs/:runId/process', async (request, reply) => {
    const { runId } = request.params as { runId: string }
    const { companyId } = request.body as { companyId: string }

    try {
      const { error } = await supabase
        .from('payroll_runs')
        .update({ status: 'processed' })
        .eq('id', runId)
        .eq('company_id', companyId)

      if (error) throw error
      fastify.log.info({ mod: 'Payroll' }, 'run processed')
      return reply.send({ success: true })
    } catch (err) {
      fastify.log.error({ mod: 'Payroll' }, 'process run error %o', err)
      return reply.status(500).send({ error: 'failed to process run' })
    }
  })

  /**
   * Get upcoming payroll info
   * @route GET /api/payroll/upcoming
   */
  fastify.get('/payroll/upcoming', async (request, reply) => {
    const { companyId } = request.query as { companyId: string }
    try {
      const result = await checkService.getNextPayroll(companyId)
      if (!result.success || !result.data) {
        throw result.error || new Error('failed')
      }
      return reply.send(result.data)
    } catch (err) {
      fastify.log.error({ mod: 'Payroll' }, 'upcoming error %o', err)
      return reply.status(500).send({ error: 'failed to fetch upcoming payroll' })
    }
  })

  /**
   * Basic payroll stats
   * @route GET /api/payroll/stats
   */
  fastify.get('/payroll/stats', async (request, reply) => {
    const { companyId } = request.query as { companyId: string }
    try {
      const { data: emp } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', companyId)

      const { data: runs } = await supabase
        .from('payroll_runs')
        .select('id')
        .eq('company_id', companyId)

      return reply.send({ employeeCount: emp?.length || 0, runCount: runs?.length || 0 })
    } catch (err) {
      fastify.log.error({ mod: 'Payroll' }, 'stats error %o', err)
      return reply.status(500).send({ error: 'failed to fetch stats' })
    }
  })
}

