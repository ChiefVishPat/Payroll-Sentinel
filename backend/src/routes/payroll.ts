import { FastifyInstance } from 'fastify';
import { supabase } from '@backend/db/client';
import { applyMigrations } from '@backend/db/migrations';
import { CheckService } from '@backend/services/check';

/**
 * Ensure the database schema exists by applying all migrations.
 * Migrations are idempotent so running this on each request is safe.
 */
async function ensureSchema(): Promise<void> {
  await applyMigrations();
}


/**
 * Payroll routes for managing payroll operations
 * Includes creating pay schedules and running payroll
 */
export default async function payrollRoutes(fastify: FastifyInstance) {
  await ensureSchema();
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
        run_number: `run_${Date.now()}`,
        pay_period_start: new Date().toISOString().split('T')[0],
        pay_period_end: new Date().toISOString().split('T')[0],
        pay_date: new Date().toISOString().split('T')[0],
        total_gross: 0,
        total_net: 0,
        total_taxes: 0,
        total_deductions: 0,
        employee_count: 0,
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
        .eq('is_active', true)

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
   * Create a new payroll run
   * @route POST /api/payroll/runs
   */
  fastify.post('/payroll/runs', async (request, reply) => {
    const { companyId, payPeriodStart, payPeriodEnd, payDate } = request.body as {
      companyId: string
      payPeriodStart: string
      payPeriodEnd: string
      payDate: string
    }
    await ensureSchema()
    try {
      const runNumber = `run_${Date.now()}`
      const { data, error } = await supabase
        .from('payroll_runs')
        .insert({
          company_id: companyId,
          run_number: runNumber,
          pay_period_start: payPeriodStart,
          pay_period_end: payPeriodEnd,
          pay_date: payDate,
          status: 'draft',
        })
        .select()
        .single()
      if (error) throw error
      fastify.log.info({ mod: 'Payroll' }, 'run created')
      return reply.send({ data })
    } catch (err) {
      fastify.log.error({ mod: 'Payroll' }, 'create run error %o', err)
      return reply.status(500).send({ error: 'failed to create run' })
    }
  })

  /**
   * Update a draft payroll run
   * @route PUT /api/payroll/runs/:id
   */
  fastify.put('/payroll/runs/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { companyId } = request.query as { companyId?: string }
    const { payPeriodStart, payPeriodEnd, payDate } = request.body as Partial<{
      payPeriodStart: string
      payPeriodEnd: string
      payDate: string
    }>
    await ensureSchema()
    try {
      const { data: existing, error: findError } = await supabase
        .from('payroll_runs')
        .select('status')
        .eq('id', id)
        .single()
      if (findError) throw findError
      if (existing?.status !== 'draft')
        return reply.status(400).send({ error: 'only draft runs editable' })

      const update: Record<string, any> = {}
      if (payPeriodStart) update.pay_period_start = payPeriodStart
      if (payPeriodEnd) update.pay_period_end = payPeriodEnd
      if (payDate) update.pay_date = payDate
      update.updated_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('payroll_runs')
        .update(update)
        .eq('id', id)
        .eq('company_id', companyId || existing.company_id)
        .select()
        .single()
      if (error) throw error
      fastify.log.info({ mod: 'Payroll' }, 'run updated')
      return reply.send({ data })
    } catch (err) {
      fastify.log.error({ mod: 'Payroll' }, 'update run error %o', err)
      return reply.status(500).send({ error: 'failed to update run' })
    }
  })

  /**
   * Delete a draft payroll run
   * @route DELETE /api/payroll/runs/:id
   */
  fastify.delete('/payroll/runs/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    await ensureSchema()
    try {
      const { data: existing, error: findError } = await supabase
        .from('payroll_runs')
        .select('status')
        .eq('id', id)
        .single()
      if (findError) throw findError
      if (existing?.status !== 'draft')
        return reply.status(400).send({ error: 'only draft runs removable' })

      const { error } = await supabase.from('payroll_runs').delete().eq('id', id)
      if (error) throw error
      fastify.log.info({ mod: 'Payroll' }, 'run deleted')
      return reply.send({ success: true })
    } catch (err) {
      fastify.log.error({ mod: 'Payroll' }, 'delete run error %o', err)
      return reply.status(500).send({ error: 'failed to delete run' })
    }
  })

  /**
   * Approve a pending payroll run
   * @route POST /api/payroll/runs/:id/approve
   */
  fastify.post('/payroll/runs/:id/approve', async (request, reply) => {
    const { id } = request.params as { id: string }
    await ensureSchema()
    try {
      const { data: existing, error: findError } = await supabase
        .from('payroll_runs')
        .select('status')
        .eq('id', id)
        .single()
      if (findError) throw findError
      if (existing?.status !== 'pending')
        return reply.status(400).send({ error: 'run not pending' })

      const { data, error } = await supabase
        .from('payroll_runs')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      fastify.log.info({ mod: 'Payroll' }, 'run approved')
      return reply.send({ data })
    } catch (err) {
      fastify.log.error({ mod: 'Payroll' }, 'approve run error %o', err)
      return reply.status(500).send({ error: 'failed to approve run' })
    }
  })

  /**
   * Revert an approved run back to draft
   * @route POST /api/payroll/runs/:id/revert
   */
  fastify.post('/payroll/runs/:id/revert', async (request, reply) => {
    const { id } = request.params as { id: string }
    await ensureSchema()
    try {
      const { data: existing, error: findError } = await supabase
        .from('payroll_runs')
        .select('status')
        .eq('id', id)
        .single()
      if (findError) throw findError
      if (existing?.status !== 'approved')
        return reply.status(400).send({ error: 'only approved runs can revert' })

      const { data, error } = await supabase
        .from('payroll_runs')
        .update({ status: 'draft', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      fastify.log.info({ mod: 'Payroll' }, 'run reverted')
      return reply.send({ data })
    } catch (err) {
      fastify.log.error({ mod: 'Payroll' }, 'revert run error %o', err)
      return reply.status(500).send({ error: 'failed to revert run' })
    }
  })

  /**
   * Mark a run as processed
   * @route POST /api/payroll/runs/:id/process
   */
  fastify.post('/payroll/runs/:id/process', async (request, reply) => {
    const { id } = request.params as { id: string }
    await ensureSchema()
    try {
      const { data, error } = await supabase
        .from('payroll_runs')
        .update({ status: 'processed', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      fastify.log.info({ mod: 'Payroll' }, 'run processed')
      return reply.send({ data })
    } catch (err) {
      fastify.log.error({ mod: 'Payroll' }, 'process run error %o', err)
      return reply.status(500).send({ error: 'failed to process run' })
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

      // Map database columns to the simplified front-end shape
      const transformed = (data || []).map(row => ({
        id: row.id,
        name: `${row.first_name} ${row.last_name}`.trim(),
        title: row.title || '',
        salary: Number(row.annual_salary || 0),
        status: row.is_active ? 'active' : 'inactive',
        department: row.department,
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

    await ensureSchema()

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
        title,
        department,
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

  /**
   * Get details for a single employee
   * @route GET /api/payroll/employees/:id
   */
  fastify.get('/payroll/employees/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { companyId } = request.query as { companyId?: string }
    await ensureSchema()
    try {
      const query = supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single()
      if (companyId) query.eq('company_id', companyId)
      const { data, error } = await query
      if (error) throw error

      const employee = {
        id: data.id,
        name: `${data.first_name} ${data.last_name}`.trim(),
        title: data.title || '',
        salary: Number(data.annual_salary || 0),
        status: data.is_active ? 'active' : 'inactive',
        department: data.department,
        created_at: data.created_at,
        updated_at: data.updated_at,
      }
      fastify.log.info({ mod: 'Payroll' }, 'employee detail fetched')
      return reply.send({ data: employee })
    } catch (err) {
      fastify.log.error({ mod: 'Payroll' }, 'employee detail error %o', err)
      return reply.status(500).send({ error: 'failed to fetch employee' })
    }
  })

  /**
   * Update an existing employee
   * @route PUT /api/payroll/employees/:id
   */
  fastify.put('/payroll/employees/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { companyId } = request.query as { companyId?: string }
    const { title, salary, status, department } = request.body as any
    await ensureSchema()
    try {
      const updates: Record<string, unknown> = {
        title,
        department,
        annual_salary: salary,
        is_active: String(status) !== 'inactive',
        updated_at: new Date().toISOString(),
      }
      const query = supabase
        .from('employees')
        .update(updates)
        .eq('id', id)
      if (companyId) query.eq('company_id', companyId)
      const { error } = await query
      if (error) throw error

      fastify.log.info({ mod: 'Payroll' }, 'employee updated')
      return reply.send({ success: true })
    } catch (err) {
      fastify.log.error({ mod: 'Payroll' }, 'update employee error %o', err)
      return reply.status(500).send({ error: 'failed to update employee' })
    }
  })

  /**
   * Soft-delete (deactivate) an employee
   * @route DELETE /api/payroll/employees/:id
   */
  fastify.delete('/payroll/employees/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { companyId } = request.query as { companyId?: string }
    await ensureSchema()
    try {
      const query = supabase
        .from('employees')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (companyId) query.eq('company_id', companyId)
      const { error } = await query
      if (error) throw error

      fastify.log.info({ mod: 'Payroll' }, 'employee deactivated')
      return reply.send({ success: true })
    } catch (err) {
      fastify.log.error({ mod: 'Payroll' }, 'delete employee error %o', err)
      return reply.status(500).send({ error: 'failed to remove employee' })
    }
  })
}

