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
  payrollRunId: string;
  status: 'pending' | 'paid' | string;
  created_at?: string;
}

/**
 * Pay schedule configuration
 */
export interface PaySchedule {
  id: string;
  companyId: string;
  frequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
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
