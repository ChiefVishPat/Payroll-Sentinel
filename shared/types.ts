/**
 * Shared DTOs for Payroll Sentinel Demo
 */

/**
 * Company record
 */
export interface Company {
  id: string;
  name: string;
  ein: string;
  state: string;
  check_company_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Linked bank account via Plaid
 */
export interface BankAccount {
  id: string;
  company_id: string;
  plaid_account_id: string;
  account_name: string;
  account_type: string;
  account_subtype: string | null;
  institution_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Payroll run result
 */
export interface PayrollRun {
  id: string;
  company_id: string;
  check_payroll_id: string;
  run_number: string;
  pay_period_start: string;
  pay_period_end: string;
  pay_date: string;
  status: "draft" | "pending" | "approved" | "processed" | "cancelled";
  total_gross: number;
  total_net: number;
  total_taxes: number;
  total_deductions: number;
  employee_count: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Pay schedule configuration
 */
export interface PaySchedule {
  id: string;
  companyId: string;
  frequency: "weekly" | "biweekly" | "semimonthly" | "monthly";
  firstPayday: string;
  isActive: boolean;
  created_at: string;
}

/**
 * Bank account balance from Plaid
 */
export interface AccountBalance {
  accountId: string;
  current: number;
  available: number | null;
  currencyCode: string;
  lastUpdated: string;
}

/**
 * Plaid Link Token response
 */
export interface LinkTokenResponse {
  linkToken: string;
  expiration: string;
  requestId: string;
}

/**
 * Plaid Access Token response
 */
export interface AccessTokenResponse {
  accessToken: string;
  itemId: string;
  requestId: string;
}

/**
 * Employee record
 */
export interface Employee {
  id: string;
  company_id: string;
  name: string;
  title: string;
  salary: number;
  employee_status: string;
  department?: string | null;
  business_unit_code?: string | null;
  business_unit_name?: string | null;
  date_of_birth?: string | null;
  date_of_joining?: string | null;
  employment_category?: string | null;
  grade?: string | null;
  designation?: string | null;
  continent?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Detailed payroll entry with salary components
 */
export interface PayrollEntry {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  gross_pay: number;
  net_pay: number;
  taxes: number;
  deductions: number;
  basic_salary?: number;
  allowance?: number;
  statutory_bonus?: number;
  total_deductions?: number;
  net_salary?: number;
  tax_spend?: number;
  reimbursement_paid?: number;
  hours?: number;
  status: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Dashboard payroll summary
 */
export interface PayrollSummary {
  totalEmployees: number;
  monthlyPayroll: number;
  nextPayroll: string | null;
  pendingRuns: number;
}
