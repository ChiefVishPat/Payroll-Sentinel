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
    account_name: string;
    account_type: string;
    account_subtype: string | null;
    institution_name: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
export interface PayrollRun {
    payrollRunId: string;
    status: 'pending' | 'paid' | string;
    created_at?: string;
}
export interface PaySchedule {
    id: string;
    companyId: string;
    frequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
    firstPayday: string;
    isActive: boolean;
    created_at: string;
}
export interface AccountBalance {
    accountId: string;
    current: number;
    available: number | null;
    currencyCode: string;
    lastUpdated: string;
}
export interface LinkTokenResponse {
    linkToken: string;
    expiration: string;
    requestId: string;
}
export interface AccessTokenResponse {
    accessToken: string;
    itemId: string;
    requestId: string;
}
//# sourceMappingURL=types.d.ts.map