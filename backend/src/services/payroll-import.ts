import { parse } from 'csv-parse/sync';
import { supabase } from '@backend/db/client';
import type { FastifyBaseLogger } from 'fastify';

/**
 * Result object returned after a payroll CSV import.
 */
export interface PayrollImportResult {
  /** Number of employee records inserted */
  employeesInserted: number;
  /** Number of payroll entry records inserted */
  entriesInserted: number;
}

/**
 * Convert possibly formatted numeric strings to a float value.
 * Handles commas, spaces and currency symbols.
 * @param value - Raw value from CSV cell
 * @returns Parsed number or 0 if invalid
 */
function toNumber(value: unknown): number {
  const num = Number(String(value ?? '').replace(/[^0-9.-]+/g, ''));
  return isNaN(num) ? 0 : num;
}

/**
 * Normalize date strings from the CSV into YYYY-MM-DD format.
 * @param value - Raw date string
 * @returns ISO date string or null if invalid
 */
function toDate(value: unknown): string | null {
  if (!value) return null;
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0] ?? null;
}

/**
 * Parse a payroll export CSV and batch insert employees and payroll entries.
 *
 * @param companyId - Company identifier to associate imported records
 * @param csvData - Raw CSV file contents as Buffer or string
 * @param logger - Fastify logger instance for structured logs
 * @returns Counts for inserted employees and payroll entries
 */
export async function importPayrollData(
  companyId: string,
  csvData: Buffer | string,
  logger: FastifyBaseLogger
): Promise<PayrollImportResult> {
  logger.info({ companyId }, 'starting payroll import');

  const records = parse(csvData, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  logger.debug({ rows: records.length }, 'parsed payroll CSV');

  const employeeRows = records.map((row: any, idx: number) => ({
    company_id: companyId,
    employee_number: row['Employee ID'] || `emp_${idx + 1}`,
    first_name: row['First Name'] || '',
    last_name: row['Last Name'] || '',
    email: `${String(row['First Name'] || 'user').toLowerCase()}.${String(
      row['Last Name'] || 'user'
    ).toLowerCase()}@example.com`,
    business_unit_code: row['Business Unit Code'] || null,
    business_unit_name: row['Busines Unit Name'] || null,
    date_of_birth: toDate(row['Date Of Birth']),
    date_of_joining: toDate(row['Date Of Joining']),
    employment_category: row['Employee Catagery'] || null,
    department: row['Departments'] || null,
    grade: row['Grade'] || null,
    designation: row['Designations'] || null,
    continent: row['Continent'] || null,
    annual_salary: toNumber(row['Gross Salary']),
    employee_status: row['Employee Status'] || 'Active',
  }));

  const { data: insertedEmployees, error: empError } = await supabase
    .from('employees')
    .insert(employeeRows)
    .select('id');

  if (empError) {
    logger.error({ err: empError }, 'employee batch insert failed');
    throw empError;
  }

  const payrollRows = (insertedEmployees || []).map((emp, idx) => ({
    employee_id: emp.id,
    gross_pay: toNumber(records[idx]['Gross Salary']),
    net_pay: toNumber(records[idx]['Net Salary']),
    taxes: toNumber(records[idx]['Tax Spend']),
    deductions: toNumber(records[idx]['Total Deductions']),
    basic_salary: toNumber(records[idx]['Basic Salary']),
    allowance: toNumber(records[idx]['Allowance']),
    statutory_bonus: toNumber(records[idx]['Statutory Bonus']),
    total_deductions: toNumber(records[idx]['Total Deductions']),
    net_salary: toNumber(records[idx]['Net Salary']),
    tax_spend: toNumber(records[idx]['Tax Spend']),
    reimbursement_paid: toNumber(records[idx]['Reimbursement Paid']),
  }));

  const { error: entryError } = await supabase
    .from('payroll_entries')
    .insert(payrollRows);

  if (entryError) {
    logger.error({ err: entryError }, 'payroll entry batch insert failed');
    throw entryError;
  }

  logger.info(
    {
      employeesInserted: insertedEmployees?.length || 0,
      entriesInserted: payrollRows.length,
    },
    'payroll import complete'
  );

  return {
    employeesInserted: insertedEmployees?.length || 0,
    entriesInserted: payrollRows.length,
  };
}

