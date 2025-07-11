-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    ein VARCHAR(50) NOT NULL,
    state VARCHAR(2) NOT NULL,
    check_company_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bank accounts table (linked via Plaid)
CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    plaid_account_id VARCHAR(255) NOT NULL UNIQUE,
    plaid_access_token VARCHAR(255) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    account_subtype VARCHAR(50),
    institution_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payroll runs table (linked via Check)
CREATE TABLE payroll_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    check_payroll_id VARCHAR(255) NOT NULL UNIQUE,
    pay_date DATE NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Balance snapshots table
CREATE TABLE balance_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    balance DECIMAL(12, 2) NOT NULL,
    available_balance DECIMAL(12, 2),
    snapshot_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Risk assessments table
CREATE TABLE risk_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    current_balance DECIMAL(12, 2) NOT NULL,
    required_float DECIMAL(12, 2) NOT NULL, -- payroll_amount * 1.10
    risk_status VARCHAR(20) NOT NULL CHECK (risk_status IN ('safe', 'at_risk', 'critical')),
    days_until_payroll INTEGER NOT NULL,
    runway_days INTEGER, -- How many days of cash runway remaining
    assessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alerts table (for idempotency and tracking)
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    risk_assessment_id UUID NOT NULL REFERENCES risk_assessments(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL DEFAULT 'payroll_risk',
    status VARCHAR(20) NOT NULL DEFAULT 'sent',
    slack_message_ts VARCHAR(255), -- Slack message timestamp for threading
    message_content TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure we don't send duplicate alerts for the same risk assessment
    UNIQUE(risk_assessment_id, alert_type)
);

-- Indexes for performance
CREATE INDEX idx_companies_created_at ON companies(created_at);
CREATE INDEX idx_bank_accounts_company_id ON bank_accounts(company_id);
CREATE INDEX idx_bank_accounts_plaid_account_id ON bank_accounts(plaid_account_id);
CREATE INDEX idx_payroll_runs_company_id ON payroll_runs(company_id);
CREATE INDEX idx_payroll_runs_pay_date ON payroll_runs(pay_date);
CREATE INDEX idx_balance_snapshots_bank_account_id ON balance_snapshots(bank_account_id);
CREATE INDEX idx_balance_snapshots_snapshot_date ON balance_snapshots(snapshot_date);
CREATE INDEX idx_risk_assessments_company_id ON risk_assessments(company_id);
CREATE INDEX idx_risk_assessments_assessed_at ON risk_assessments(assessed_at);
CREATE INDEX idx_alerts_company_id ON alerts(company_id);
CREATE INDEX idx_alerts_sent_at ON alerts(sent_at);

-- Row Level Security policies (basic setup)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- For demo purposes, we'll use a simple policy that allows all operations
-- In production, you'd want more sophisticated policies based on user roles
CREATE POLICY "Allow all operations for now" ON companies FOR ALL USING (true);
CREATE POLICY "Allow all operations for now" ON bank_accounts FOR ALL USING (true);
CREATE POLICY "Allow all operations for now" ON payroll_runs FOR ALL USING (true);
CREATE POLICY "Allow all operations for now" ON balance_snapshots FOR ALL USING (true);
CREATE POLICY "Allow all operations for now" ON risk_assessments FOR ALL USING (true);
CREATE POLICY "Allow all operations for now" ON alerts FOR ALL USING (true);

-- Update triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON bank_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_runs_updated_at BEFORE UPDATE ON payroll_runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
