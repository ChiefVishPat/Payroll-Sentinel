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
        start_date date,
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

  // Verify start_date column
  const { error: startDateError } = await supabase
    .from('employees')
    .select('start_date')
    .limit(1);
  if (startDateError?.code === '42703') {
    const { error: alterError } = await supabase.rpc('execute_sql', {
      sql: 'ALTER TABLE employees ADD COLUMN start_date date;'
    });
    if (alterError) fastify.log.error('Failed to add start_date column', alterError);
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
}
