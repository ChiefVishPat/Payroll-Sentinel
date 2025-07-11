export interface Company {
  id: string;
  name: string;
  ein: string;
  state: string;
  check_company_id: string;
  created_at: string;
  updated_at: string;
}

export interface BankAccount {
  id: string;
  company_id: string;
  plaid_account_id: string;
  plaid_access_token: string;
  account_name: string;
  account_type: string;
  account_subtype: string | null;
  institution_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PayrollRun {
  id: string;
  company_id: string;
  check_payroll_id: string;
  pay_date: string;
  total_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface BalanceSnapshot {
  id: string;
  bank_account_id: string;
  balance: number;
  available_balance: number | null;
  snapshot_date: string;
  created_at: string;
}

export interface RiskAssessment {
  id: string;
  company_id: string;
  bank_account_id: string;
  payroll_run_id: string;
  current_balance: number;
  required_float: number;
  risk_status: 'safe' | 'at_risk' | 'critical';
  days_until_payroll: number;
  runway_days: number | null;
  assessed_at: string;
  created_at: string;
}

export interface Alert {
  id: string;
  company_id: string;
  risk_assessment_id: string;
  alert_type: string;
  status: string;
  slack_message_ts: string | null;
  message_content: string | null;
  sent_at: string;
  created_at: string;
}

// Input types for creating new records
export interface CreateCompanyInput {
  name: string;
  ein: string;
  state: string;
}

export interface CreateBankAccountInput {
  company_id: string;
  plaid_account_id: string;
  plaid_access_token: string;
  account_name: string;
  account_type: string;
  account_subtype?: string;
  institution_name?: string;
}

export interface CreatePayrollRunInput {
  company_id: string;
  check_payroll_id: string;
  pay_date: string;
  total_amount: number;
  status?: string;
}

export interface CreateBalanceSnapshotInput {
  bank_account_id: string;
  balance: number;
  available_balance?: number;
}

export interface CreateRiskAssessmentInput {
  company_id: string;
  bank_account_id: string;
  payroll_run_id: string;
  current_balance: number;
  required_float: number;
  risk_status: 'safe' | 'at_risk' | 'critical';
  days_until_payroll: number;
  runway_days?: number;
}

export interface CreateAlertInput {
  company_id: string;
  risk_assessment_id: string;
  alert_type?: string;
  status?: string;
  slack_message_ts?: string;
  message_content?: string;
}
