/* eslint-disable @typescript-eslint/naming-convention */

/**
 * Hand-written TypeScript interfaces that mirror the tables
 * in schema.sql.  Use them for service layers and input validation.
 */

/*──────────────────  CORE ENTITIES  ──────────────────*/

export interface Company {
  id: string;
  name: string;
  ein: string;
  state: string;
  check_company_id: string;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  company_id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  department?: string;
  annual_salary?: number;
  hourly_rate?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PayrollRun {
  id: string;
  company_id: string;
  run_number: string;
  pay_period_start: string;
  pay_period_end: string;
  pay_date: string;
  status: 'draft' | 'pending' | 'approved' | 'processed' | 'cancelled';
  total_gross: number;
  total_net: number;
  total_taxes: number;
  total_deductions: number;
  employee_count: number;
  created_at: string;
  updated_at: string;
}

export interface PayrollEntry {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  gross_pay: number;
  net_pay: number;
  taxes: number;
  deductions: number;
  hours?: number;
  status: 'pending' | 'approved' | 'processed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

/* existing BankAccount, BalanceSnapshot, RiskAssessment, Alert
   interfaces stay as-is — clip for brevity */

export interface CreateEmployeeInput
  extends Omit<Employee, 'id' | 'created_at' | 'updated_at' | 'is_active'> {
  is_active?: boolean;
}

export interface CreatePayrollRunInput
  extends Pick<
    PayrollRun,
    | 'company_id'
    | 'run_number'
    | 'pay_period_start'
    | 'pay_period_end'
    | 'pay_date'
  > {}

export interface CreatePayrollEntryInput
  extends Pick<
    PayrollEntry,
    'payroll_run_id' | 'employee_id' | 'gross_pay' | 'net_pay' | 'hours'
  > {
  taxes?: number;
  deductions?: number;
  status?: PayrollEntry['status'];
}
