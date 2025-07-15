import { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import { supabase } from '@backend/db/client';
import { CheckService } from '@backend/services/check';

/**
 * Ensure required database tables and columns exist.
 * This helper checks for the employees table and key columns
 * and creates them if missing using raw SQL via Supabase RPC.
 */
async function ensureSchema(fastify: FastifyInstance): Promise<void> {
  // Check if employees table exists
  const { error: tableError } = await supabase
    .from('employees')
    .select('id')
    .limit(1);

  if (tableError?.code === '42P01') {
    const createTableSQL = `
      CREATE TABLE employees (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
        employee_number text UNIQUE NOT NULL,
        first_name text NOT NULL,
        last_name text NOT NULL,
        email text UNIQUE NOT NULL,
        department text,
        annual_salary numeric(10,2),
        hourly_rate numeric(8,2),
        is_active boolean DEFAULT true,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );`;

    const { error: createError } = await supabase.rpc('execute_sql', {
      sql: createTableSQL,
    });

    if (createError) {
      fastify.log.error('Failed to create employees table', createError);
    } else {
      const logPath = path.resolve(__dirname, '../..', 'logs', 'SCHEMA_CHANGES.md');
      const entry = `- ${new Date().toISOString()}: created employees table\n`;
      fs.appendFileSync(logPath, entry);
    }
  }

  // Verify department column
  const { error: deptError } = await supabase
    .from('employees')
    .select('department')
    .limit(1);
  if (deptError?.code === '42703') {
    const { error: alterError } = await supabase.rpc('execute_sql', {
      sql: 'ALTER TABLE employees ADD COLUMN department text;'
    });
    if (alterError) fastify.log.error('Failed to add department column', alterError);
  }
}

/**
 * Payroll routes for managing payroll operations
 * Includes creating pay schedules and running payroll
 */
export default async function payrollRoutes(fastify: FastifyInstance) {
  await ensureSchema(fastify);
  const checkService = fastify.services.checkService as CheckService;

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

    await ensureSchema(fastify);

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
    await ensureSchema(fastify)
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
    await ensureSchema(fastify)
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
    await ensureSchema(fastify)
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true })
      if (error) throw error

      // Map database columns to the simplified front-end shape
      const transformed = (data || []).map(row => ({
        id: row.id,
        name: `${row.first_name} ${row.last_name}`.trim(),
        title: row.department || '',
        salary: Number(row.annual_salary || 0),
        status: row.is_active ? 'active' : 'inactive',
        department: row.department
      }))

      fastify.log.info({ mod: 'Payroll' }, 'employees fetched')
      return reply.send({ data: transformed })
    } catch (err) {
      fastify.log.error({ mod: 'Payroll' }, 'employees error %o', err)
      return reply.status(500).send({ error: 'failed to fetch employees' })
    }
  })

  /**
   * Add a new employee
   * Maps simple front-end fields to the database schema
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
    } = request.body as any

    await ensureSchema(fastify)

    try {
      const [firstName, ...rest] = String(name || '').trim().split(' ')
      const lastName = rest.join(' ') || ''
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase() || 'user'}@example.com`

      const { error } = await supabase.from('employees').insert({
        company_id: companyId,
        employee_number: `emp_${Date.now()}`,
        first_name: firstName,
        last_name: lastName,
        email,
        department: department || title,
        annual_salary: salary,
        is_active: String(status) !== 'inactive',
      })
      if (error) throw error
      fastify.log.info({ mod: 'Payroll' }, 'employee added')
      await reply.send({ success: true })
    } catch (err) {
      fastify.log.error({ mod: 'Payroll' }, 'add employee error %o', err)
      return reply.status(500).send({ error: 'failed to add employee' })
    }
  })
}

