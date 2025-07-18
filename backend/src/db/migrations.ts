import fs from 'fs';
import path from 'path';
import { supabase } from './client';

/**
 * Ensure employee table exists with latest columns.
 * This helper can run at startup or via CLI to apply missing schema
 * changes. It logs each change to logs/SCHEMA_CHANGES.md.
 */
export async function ensurePayrollSchema(): Promise<void> {
  // Check employees table
  const { error: tableError } = await supabase
    .from('employees')
    .select('id')
    .limit(1);

  const logPath = path.resolve(__dirname, '../..', 'logs', 'SCHEMA_CHANGES.md');

  if (tableError?.code === '42P01') {
    const sql = `
      CREATE TABLE employees (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
        employee_number text UNIQUE NOT NULL,
        first_name text NOT NULL,
        last_name text NOT NULL,
        email text UNIQUE NOT NULL,
        title text,
        department text,
        annual_salary numeric(10,2),
        hourly_rate numeric(8,2),
        is_active boolean DEFAULT true,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );`;
    const { error: createError } = await supabase.rpc('execute_sql', { sql });
    if (createError) {
      throw new Error(`Failed to create employees table: ${createError.message}`);
    }
    fs.appendFileSync(logPath, `- ${new Date().toISOString()}: created employees table\n`);
  }

  // Ensure department column
  const { error: deptError } = await supabase.from('employees').select('department').limit(1);
  if (deptError?.code === '42703') {
    const { error } = await supabase.rpc('execute_sql', { sql: 'ALTER TABLE employees ADD COLUMN department text;' });
    if (error) throw new Error(`Failed to add department column: ${error.message}`);
    fs.appendFileSync(logPath, `- ${new Date().toISOString()}: added employees.department column\n`);
  }

  // Ensure title column
  const { error: titleError } = await supabase.from('employees').select('title').limit(1);
  if (titleError?.code === '42703') {
    const { error } = await supabase.rpc('execute_sql', { sql: 'ALTER TABLE employees ADD COLUMN title text;' });
    if (error) throw new Error(`Failed to add title column: ${error.message}`);
    fs.appendFileSync(logPath, `- ${new Date().toISOString()}: added employees.title column\n`);
  }
}
