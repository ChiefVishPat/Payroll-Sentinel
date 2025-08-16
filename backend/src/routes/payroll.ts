import { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { supabase } from '@backend/db/client';
import { applyMigrations } from '@backend/db/migrations';
import { CheckService } from '@backend/services/check';
import { importPayrollData } from '@backend/services/payroll-import';

/**
 * Ensure the database schema exists by applying all migrations.
 * Migrations are idempotent so running this on each request is safe.
 */
async function ensureSchema(): Promise<void> {
  await applyMigrations();
}

/**
 * Safely convert a value to a YYYY-MM-DD string or null.
 * @param value - Raw date input
 * @returns Normalized date string or null if invalid
 */
function safeDate(value: unknown): string | null {
  if (!value) return null;
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
}

/**
 * Convert a value to a number with fallback to 0.
 * @param value - Numeric input
 * @returns Parsed number or 0
 */
function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Payroll routes for managing payroll operations
 * Includes creating pay schedules and running payroll
 */
export default async function payrollRoutes(fastify: FastifyInstance) {
  await ensureSchema();
  // Enable multipart support for CSV uploads
  await fastify.register(multipart);
  const checkService = fastify.services.checkService as CheckService;

  /**
   * Import payroll data from a CSV file.
   * Supports multipart uploads or base64-encoded payloads.
   * @route POST /api/payroll/import
   */
  fastify.post('/payroll/import', async (request, reply) => {
    const { companyId, file } = request.body as { companyId: string; file?: string };
    await ensureSchema();

    try {
      let buffer: Buffer;
      // Handle multipart form uploads
      if ((request as any).isMultipart && (request as any).isMultipart()) {
        const upload = await (request as any).file();
        buffer = await upload.toBuffer();
      } else if (file) {
        buffer = Buffer.from(file, 'base64');
      } else {
        return reply.status(400).send({ error: 'No CSV provided' });
      }

      const result = await importPayrollData(companyId, buffer, fastify.log);
      fastify.log.info({ mod: 'Payroll' }, 'payroll import complete');
      return reply.send({ success: true, ...result });
    } catch (err) {
      fastify.log.error({ mod: 'Payroll' }, 'payroll import failed %o', err);
      return reply.status(500).send({ error: 'failed to import payroll data' });
    }
  });

  /**
   * Schedule payroll for a company
   * @route POST /api/pay-schedule
   */
  fastify.post('/pay-schedule', async (request, reply) => {
    const { companyId, frequency, firstPayday } = request.body;

    try {
      const result = await checkService.createPaySchedule(
        companyId,
        frequency,
        firstPayday
      );

      if (!result.success || !result.data) {
        fastify.log.error('Pay schedule creation failed:', result.error);
        reply
          .status(500)
          .send({
            error: result.error?.message || 'Unable to schedule payroll',
          });
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
        reply
          .status(500)
          .send({ error: result.error?.message || 'Unable to run payroll' });
        return;
      }

      const { payrollRunId } = result.data;
      fastify.log.info(`Payroll run initiated: ${payrollRunId}`);

      // Simulate polling for payroll status
      let status = 'pending';
      while (status !== 'paid') {
        await new Promise(res => setTimeout(res, 2000)); // simulate delay
        const statusResponse =
          await checkService.getPayrollStatus(payrollRunId);
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
    const start = Date.now();
    const { companyId } = request.query as { companyId: string };
    await ensureSchema();
    try {
      // Fetch active employees once to avoid counting re-activations as new hires
      const { data: empRows } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', companyId)
        .eq('employee_status', 'Active');

      // Calculate payroll totals from runs scheduled in the current month
      const now = new Date();
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];
      const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0];

      const { data: monthRuns } = await supabase
        .from('payroll_runs')
        .select('total_gross')
        .eq('company_id', companyId)
        .gte('pay_date', startMonth)
        .lte('pay_date', endMonth);

      const monthlyPayroll =
        monthRuns?.reduce((t, r) => t + Number(r.total_gross || 0), 0) || 0;

      // Fetch earliest upcoming payroll run for the card display
      const { data: nextRows } = await supabase
        .from('payroll_runs')
        .select('pay_date')
        .eq('company_id', companyId)
        .gte('pay_date', now.toISOString().split('T')[0])
        .order('pay_date', { ascending: true })
        .limit(1);

      const { data: runRows } = await supabase
        .from('payroll_runs')
        .select('status')
        .eq('company_id', companyId);

      const totalEmployees = empRows?.length || 0;
      const nextPayroll = nextRows?.[0]?.pay_date || null;
      const pendingRuns =
        runRows?.filter(r => r.status === 'pending').length || 0;

      fastify.log.info(
        { mod: 'Payroll' },
        'summary fetched in %d ms',
        Date.now() - start
      );
      return reply.send({
        totalEmployees,
        monthlyPayroll,
        nextPayroll,
        pendingRuns,
      });
    } catch (error) {
      fastify.log.error({ mod: 'Payroll' }, 'summary error %o', error);
      return reply.status(500).send({ error: 'failed to fetch summary' });
    }
  });

  /**
   * Get payroll runs
   * @route GET /api/payroll/runs
   */
  fastify.get('/payroll/runs', async (request, reply) => {
    const { companyId } = request.query as { companyId: string };
    await ensureSchema();
    try {
      const { data, error } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('company_id', companyId)
        .order('pay_date', { ascending: false });
      if (error) throw error;
      fastify.log.info({ mod: 'Payroll' }, 'runs fetched');
      return reply.send({ data });
    } catch (err) {
      fastify.log.error({ mod: 'Payroll' }, 'runs error %o', err);
      return reply.status(500).send({ error: 'failed to fetch runs' });
    }
  });

  /**
   * Create a new payroll run
   * @route POST /api/payroll/runs
   */
  fastify.post('/payroll/runs', async (request, reply) => {
    const {
      companyId,
      payPeriodStart,
      payPeriodEnd,
      payDate,
      totalGross,
      draft = true,
    } = request.body as {
      companyId: string;
      payPeriodStart: string;
      payPeriodEnd: string;
      payDate: string;
      totalGross?: number;
      draft?: boolean;
    };
    await ensureSchema();
    try {
      const runNumber = `run_${Date.now()}`;

      // Create draft run in the mocked Check service to obtain an ID and totals
      const result = await checkService.createPayrollRun(
        companyId,
        payPeriodStart,
        payPeriodEnd,
        payDate
      );

      if (!result.success || !result.data) {
        fastify.log.error(
          { mod: 'Payroll' },
          'create run check service error %o',
          result.error
        );
        throw new Error(result.error?.message || 'check service failed');
      }

      const checkRun = result.data;

      const status = draft ? 'draft' : 'pending';

      const { data, error } = await supabase
        .from('payroll_runs')
        .insert({
          company_id: companyId,
          check_payroll_id: checkRun.id,
          run_number: runNumber,
          pay_period_start: payPeriodStart,
          pay_period_end: payPeriodEnd,
          pay_date: payDate,
          total_gross:
            typeof totalGross === 'number' ? totalGross : checkRun.totalGross,
          total_net: checkRun.totalNet,
          total_taxes: checkRun.totalTaxes,
          total_deductions: checkRun.totalDeductions,
          employee_count: checkRun.employeeCount,
          status,
        })
        .select()
        .single();
      if (error) {
        if (error.code === '23505') {
          const { data: recent } = await supabase
            .from('payroll_runs')
            .select('created_at')
            .eq('company_id', companyId)
            .eq('run_number', runNumber)
            .maybeSingle();
          if (
            recent &&
            new Date(recent.created_at).getTime() > Date.now() - 10000
          ) {
            return reply.status(409).send({ error: 'duplicate run' });
          }
        }
        throw error;
      }
      fastify.log.info({ mod: 'Payroll' }, 'run created');
      return reply.send({ data });
    } catch (err) {
      fastify.log.error({ mod: 'Payroll' }, 'create run error %o', err);
      return reply.status(500).send({ error: 'failed to create run' });
    }
  });

  /**
   * Update a draft payroll run
   * @route PUT /api/payroll/runs/:id
   */
  fastify.put('/payroll/runs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { companyId } = request.query as { companyId?: string };
    const { payPeriodStart, payPeriodEnd, payDate, totalGross } =
      request.body as Partial<{
        payPeriodStart: string;
        payPeriodEnd: string;
        payDate: string;
        totalGross: number;
      }>;
    await ensureSchema();
    try {
      const { data: existing, error: findError } = await supabase
        .from('payroll_runs')
        .select('status, company_id')
        .eq('id', id)
        .single();
      if (findError) throw findError;
      if (!['draft', 'pending'].includes(existing?.status || ''))
        return reply.status(400).send({ error: 'run not editable' });

      const update: Record<string, any> = {};
      if (payPeriodStart) update.pay_period_start = payPeriodStart;
      if (payPeriodEnd) update.pay_period_end = payPeriodEnd;
      if (payDate) update.pay_date = payDate;
      if (typeof totalGross === 'number') update.total_gross = totalGross;
      update.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('payroll_runs')
        .update(update)
        .eq('id', id)
        .eq('company_id', companyId || existing.company_id)
        .select()
        .single();
      if (error) throw error;
      fastify.log.info({ mod: 'Payroll' }, 'run updated');
      return reply.send({ data });
    } catch (err) {
      fastify.log.error({ mod: 'Payroll' }, 'update run error %o', err);
      return reply.status(500).send({ error: 'failed to update run' });
    }
  });

  /**
   * Delete a draft payroll run
   * @route DELETE /api/payroll/runs/:id
   */
  fastify.delete('/payroll/runs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await ensureSchema();
    try {
      const { data: existing, error: findError } = await supabase
        .from('payroll_runs')
        .select('status')
        .eq('id', id)
        .single();
      if (findError) throw findError;
      if (existing?.status !== 'draft')
        return reply.status(400).send({ error: 'only draft runs removable' });

      const { error } = await supabase
        .from('payroll_runs')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fastify.log.info({ mod: 'Payroll' }, 'run deleted');
      return reply.send({ success: true });
    } catch (err) {
      fastify.log.error({ mod: 'Payroll' }, 'delete run error %o', err);
      return reply.status(500).send({ error: 'failed to delete run' });
    }
  });

  /**
   * Submit a draft payroll run for approval
   * @route POST /api/payroll/runs/:id/submit
   */
  fastify.post('/payroll/runs/:id/submit', async (request, reply) => {
    const { id } = request.params as { id: string };
    await ensureSchema();
    try {
      const { data: existing, error: findError } = await supabase
        .from('payroll_runs')
        .select('status')
        .eq('id', id)
        .single();
      if (findError) throw findError;
      if (existing?.status !== 'draft')
        return reply.status(400).send({ error: 'run not draft' });

      const { data, error } = await supabase
        .from('payroll_runs')
        .update({ status: 'pending', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      fastify.log.info({ mod: 'Payroll' }, 'run submitted');
      return reply.send({ data });
    } catch (err) {
      fastify.log.error({ mod: 'Payroll' }, 'submit run error %o', err);
      return reply.status(500).send({ error: 'failed to submit run' });
    }
  });

  /**
   * Approve a pending payroll run
   * @route POST /api/payroll/runs/:id/approve
   */
  fastify.post('/payroll/runs/:id/approve', async (request, reply) => {
    const { id } = request.params as { id: string };
    await ensureSchema();
    try {
      const { data: existing, error: findError } = await supabase
        .from('payroll_runs')
        .select('status')
        .eq('id', id)
        .single();
      if (findError) throw findError;
      if (existing?.status !== 'pending')
        return reply.status(400).send({ error: 'run not pending' });

      const { data, error } = await supabase
        .from('payroll_runs')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      fastify.log.info({ mod: 'Payroll' }, 'run approved');
      return reply.send({ data });
    } catch (err) {
      fastify.log.error({ mod: 'Payroll' }, 'approve run error %o', err);
      return reply.status(500).send({ error: 'failed to approve run' });
    }
  });

  /**
   * Revert an approved run back to draft
   * @route POST /api/payroll/runs/:id/revert
   */
  fastify.post('/payroll/runs/:id/revert', async (request, reply) => {
    const { id } = request.params as { id: string };
    await ensureSchema();
    try {
      const { data: existing, error: findError } = await supabase
        .from('payroll_runs')
        .select('status')
        .eq('id', id)
        .single();
      if (findError) throw findError;
      if (existing?.status !== 'approved')
        return reply
          .status(400)
          .send({ error: 'only approved runs can revert' });

      const { data, error } = await supabase
        .from('payroll_runs')
        .update({ status: 'draft', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      fastify.log.info({ mod: 'Payroll' }, 'run reverted');
      return reply.send({ data });
    } catch (err) {
      fastify.log.error({ mod: 'Payroll' }, 'revert run error %o', err);
      return reply.status(500).send({ error: 'failed to revert run' });
    }
  });

  /**
   * Mark a run as processed
   * @route POST /api/payroll/runs/:id/process
   */
  fastify.post('/payroll/runs/:id/process', async (request, reply) => {
    const { id } = request.params as { id: string };
    await ensureSchema();
    try {
      const { data, error } = await supabase
        .from('payroll_runs')
        .update({ status: 'processed', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      fastify.log.info({ mod: 'Payroll' }, 'run processed');
      return reply.send({ data });
    } catch (err) {
      fastify.log.error({ mod: 'Payroll' }, 'process run error %o', err);
      return reply.status(500).send({ error: 'failed to process run' });
    }
  });

  /**
   * Get employees
   * @route GET /api/payroll/employees
   */
  fastify.get('/payroll/employees', async (request, reply) => {
    const { companyId } = request.query as { companyId: string };
    await ensureSchema();
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true });
      if (error) throw error;

      // Map database columns to the simplified front-end shape
      const transformed = (data || []).map(row => ({
        id: row.id,
        name: `${row.first_name} ${row.last_name}`.trim(),
        title: row.title || '',
        salary: safeNumber(row.annual_salary),
        employee_status:
          row.employee_status?.toLowerCase() === 'active' ? 'active' : 'inactive',
        department: row.department,
        business_unit_code: row.business_unit_code || null,
        business_unit_name: row.business_unit_name || null,
        date_of_birth: row.date_of_birth || null,
        date_of_joining: row.date_of_joining || null,
        employment_category: row.employment_category || null,
        grade: row.grade || null,
        designation: row.designation || null,
        continent: row.continent || null,
      }));

      fastify.log.info({ mod: 'Payroll' }, 'employees fetched');
      return reply.send({ data: transformed });
    } catch (err) {
      fastify.log.error({ mod: 'Payroll' }, 'employees error %o', err);
      return reply.status(500).send({ error: 'failed to fetch employees' });
    }
  });

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
      employee_status,
      department,
      business_unit_code,
      business_unit_name,
      date_of_birth,
      date_of_joining,
      employment_category,
      grade,
      designation,
      continent,
    } = request.body as any;

      await ensureSchema();

      try {
        // Basic validation for required fields
        if (!companyId || !name) {
          return reply
            .status(400)
            .send({ error: 'companyId and name are required' });
        }
        const [firstName, ...rest] = String(name || '')
          .trim()
          .split(' ');
      const lastName = rest.join(' ') || '';
      const email = `${firstName.toLowerCase()}.${
        lastName.toLowerCase() || 'user'
      }@example.com`;

      const { error } = await supabase.from('employees').insert({
        company_id: companyId,
        employee_number: `emp_${Date.now()}`,
        first_name: firstName,
        last_name: lastName,
        email,
        title,
        department,
        annual_salary: safeNumber(salary),
        employee_status:
          String(employee_status).toLowerCase() === 'inactive'
            ? 'Inactive'
            : 'Active',
        business_unit_code: business_unit_code || null,
        business_unit_name: business_unit_name || null,
        date_of_birth: safeDate(date_of_birth),
        date_of_joining: safeDate(date_of_joining),
        employment_category: employment_category || null,
        grade: grade || null,
        designation: designation || null,
        continent: continent || null,
      });
      if (error) throw error;
      fastify.log.info({ mod: 'Payroll' }, 'employee added');
      await reply.send({ success: true });
    } catch (err) {
      fastify.log.error({ mod: 'Payroll' }, 'add employee error %o', err);
      return reply.status(500).send({ error: 'failed to add employee' });
    }
  });

  /**
   * Get details for a single employee
   * @route GET /api/payroll/employees/:id
   */
  fastify.get('/payroll/employees/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { companyId } = request.query as { companyId?: string };
    await ensureSchema();
    try {
      const query = supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();
      if (companyId) query.eq('company_id', companyId);
      const { data, error } = await query;
      if (error) throw error;

      const employee = {
        id: data.id,
        name: `${data.first_name} ${data.last_name}`.trim(),
        title: data.title || '',
        salary: safeNumber(data.annual_salary),
        employee_status:
          data.employee_status?.toLowerCase() === 'active' ? 'active' : 'inactive',
        department: data.department,
        business_unit_code: data.business_unit_code || null,
        business_unit_name: data.business_unit_name || null,
        date_of_birth: data.date_of_birth || null,
        date_of_joining: data.date_of_joining || null,
        employment_category: data.employment_category || null,
        grade: data.grade || null,
        designation: data.designation || null,
        continent: data.continent || null,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
      fastify.log.info({ mod: 'Payroll' }, 'employee detail fetched');
      return reply.send({ data: employee });
    } catch (err) {
      fastify.log.error({ mod: 'Payroll' }, 'employee detail error %o', err);
      return reply.status(500).send({ error: 'failed to fetch employee' });
    }
  });

  /**
   * Update an existing employee
   * @route PUT /api/payroll/employees/:id
   */
  fastify.put('/payroll/employees/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { companyId } = request.query as { companyId?: string };
    const {
      title,
      salary,
      employee_status,
      department,
      business_unit_code,
      business_unit_name,
      date_of_birth,
      date_of_joining,
      employment_category,
      grade,
      designation,
      continent,
    } = request.body as any;
    await ensureSchema();
    try {
      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (title !== undefined) updates.title = title;
      if (department !== undefined) updates.department = department;
      if (salary !== undefined) updates.annual_salary = safeNumber(salary);
      if (employee_status !== undefined)
        updates.employee_status =
          String(employee_status).toLowerCase() === 'inactive'
            ? 'Inactive'
            : 'Active';
      if (business_unit_code !== undefined)
        updates.business_unit_code = business_unit_code || null;
      if (business_unit_name !== undefined)
        updates.business_unit_name = business_unit_name || null;
      if (date_of_birth !== undefined)
        updates.date_of_birth = safeDate(date_of_birth);
      if (date_of_joining !== undefined)
        updates.date_of_joining = safeDate(date_of_joining);
      if (employment_category !== undefined)
        updates.employment_category = employment_category || null;
      if (grade !== undefined) updates.grade = grade || null;
      if (designation !== undefined) updates.designation = designation || null;
      if (continent !== undefined) updates.continent = continent || null;
      const query = supabase.from('employees').update(updates).eq('id', id);
      if (companyId) query.eq('company_id', companyId);
      const { error } = await query;
      if (error) throw error;

      fastify.log.info({ mod: 'Payroll' }, 'employee updated');
      return reply.send({ success: true });
    } catch (err) {
      fastify.log.error({ mod: 'Payroll' }, 'update employee error %o', err);
      return reply.status(500).send({ error: 'failed to update employee' });
    }
  });

  /**
   * Soft-delete (deactivate) an employee
   * @route DELETE /api/payroll/employees/:id
   */
  fastify.delete('/payroll/employees/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { companyId } = request.query as { companyId?: string };
    await ensureSchema();
    try {
      const query = supabase
        .from('employees')
        .update({ employee_status: 'Inactive', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (companyId) query.eq('company_id', companyId);
      const { error } = await query;
      if (error) throw error;

      fastify.log.info({ mod: 'Payroll' }, 'employee deactivated');
      return reply.send({ success: true });
    } catch (err) {
      fastify.log.error({ mod: 'Payroll' }, 'delete employee error %o', err);
      return reply.status(500).send({ error: 'failed to remove employee' });
    }
  });
}
