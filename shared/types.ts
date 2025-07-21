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
  status: string;
  department?: string | null;
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
