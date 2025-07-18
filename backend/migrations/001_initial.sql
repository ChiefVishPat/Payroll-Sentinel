-- Enable UUID & pgcrypto extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

/*──────────────────  CORE TABLES  ──────────────────*/

-- Companies
CREATE TABLE IF NOT EXISTS companies (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT        NOT NULL,
  ein                TEXT        NOT NULL,
  state              TEXT        NOT NULL,
  check_company_id   TEXT        NOT NULL,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Employees  ★ restored
CREATE TABLE IF NOT EXISTS employees (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID        REFERENCES companies(id) ON DELETE CASCADE,
  employee_number  TEXT UNIQUE NOT NULL,
  first_name       TEXT        NOT NULL,
  last_name        TEXT        NOT NULL,
  email            TEXT UNIQUE NOT NULL,
  title            TEXT,
  department       TEXT,
  annual_salary    NUMERIC(10,2),
  hourly_rate      NUMERIC(8,2),
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Payroll runs (high-level pay periods)
CREATE TABLE IF NOT EXISTS payroll_runs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID        REFERENCES companies(id) ON DELETE CASCADE,
  run_number       TEXT UNIQUE NOT NULL,
  pay_period_start DATE        NOT NULL,
  pay_period_end   DATE        NOT NULL,
  pay_date         DATE        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'draft' 
                 CHECK (status IN ('draft','pending','approved','processed','cancelled')),
  total_gross      NUMERIC(12,2) DEFAULT 0,
  total_net        NUMERIC(12,2) DEFAULT 0,
  total_taxes      NUMERIC(12,2) DEFAULT 0,
  total_deductions NUMERIC(12,2) DEFAULT 0,
  employee_count   INTEGER      DEFAULT 0,
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW()
);

-- Payroll entries  ★ restored
CREATE TABLE IF NOT EXISTS payroll_entries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id   UUID REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id      UUID REFERENCES employees(id)    ON DELETE CASCADE,
  gross_pay        NUMERIC(10,2) NOT NULL,
  net_pay          NUMERIC(10,2) NOT NULL,
  taxes            NUMERIC(10,2) DEFAULT 0,
  deductions       NUMERIC(10,2) DEFAULT 0,
  hours            NUMERIC(6,2),
  status           TEXT DEFAULT 'pending'
                 CHECK (status IN ('pending','approved','processed','cancelled')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Bank accounts
CREATE TABLE IF NOT EXISTS bank_accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID        REFERENCES companies(id) ON DELETE CASCADE,
  plaid_account_id  TEXT UNIQUE NOT NULL,
  plaid_access_token TEXT       NOT NULL,
  account_name      TEXT        NOT NULL,
  account_type      TEXT        NOT NULL,
  account_subtype   TEXT,
  institution_name  TEXT,
  current_balance   NUMERIC(12,2),
  available_balance NUMERIC(12,2),
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Risk assessments
CREATE TABLE IF NOT EXISTS risk_assessments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID REFERENCES companies(id)      ON DELETE CASCADE,
  bank_account_id  UUID REFERENCES bank_accounts(id)  ON DELETE CASCADE,
  payroll_run_id   UUID REFERENCES payroll_runs(id)   ON DELETE CASCADE,
  current_balance  NUMERIC(12,2) NOT NULL,
  required_float   NUMERIC(12,2) NOT NULL,
  risk_status      TEXT NOT NULL
                 CHECK (risk_status IN ('safe','at_risk','critical')),
  days_until_payroll INTEGER NOT NULL,
  runway_days      INTEGER,
  assessed_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID REFERENCES companies(id)         ON DELETE CASCADE,
  risk_assessment_id UUID REFERENCES risk_assessments(id) ON DELETE CASCADE,
  alert_type        TEXT    NOT NULL DEFAULT 'payroll_risk',
  status            TEXT    NOT NULL DEFAULT 'sent',
  slack_message_ts  TEXT,
  message_content   TEXT,
  sent_at           TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (risk_assessment_id, alert_type)
);

/*──────────────────────  INDEXES  ──────────────────────*/

CREATE INDEX IF NOT EXISTS idx_employees_company_id          ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_active              ON employees(is_active);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_company_id       ON payroll_runs(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_status           ON payroll_runs(status);

CREATE INDEX IF NOT EXISTS idx_payroll_entries_payroll_run_id ON payroll_entries(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_employee_id    ON payroll_entries(employee_id);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_company_id      ON bank_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_company_id   ON risk_assessments(company_id);

/*──────────────  RLS  &  POLICIES  ──────────────*/

ALTER TABLE companies         ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees         ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_entries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts            ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- quick “allow all” policies for dev
  PERFORM 1 FROM pg_policies WHERE policyname = 'allow_all_companies';
  IF NOT FOUND THEN
    CREATE POLICY allow_all_companies          ON companies         FOR ALL USING (true);
    CREATE POLICY allow_all_employees         ON employees         FOR ALL USING (true);
    CREATE POLICY allow_all_pruns            ON payroll_runs      FOR ALL USING (true);
    CREATE POLICY allow_all_pentries         ON payroll_entries   FOR ALL USING (true);
    CREATE POLICY allow_all_bank_accounts    ON bank_accounts     FOR ALL USING (true);
    CREATE POLICY allow_all_risk_assessments ON risk_assessments  FOR ALL USING (true);
    CREATE POLICY allow_all_alerts           ON alerts            FOR ALL USING (true);
  END IF;
END$$;

/*──────────────  updated_at trigger  ──────────────*/

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Companies
DROP TRIGGER IF EXISTS trg_updated_companies ON companies;
CREATE TRIGGER trg_updated_companies
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Employees
DROP TRIGGER IF EXISTS trg_updated_employees ON employees;
CREATE TRIGGER trg_updated_employees
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Payroll runs
DROP TRIGGER IF EXISTS trg_updated_payroll_runs ON payroll_runs;
CREATE TRIGGER trg_updated_payroll_runs
  BEFORE UPDATE ON payroll_runs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Payroll entries
DROP TRIGGER IF EXISTS trg_updated_payroll_entries ON payroll_entries;
CREATE TRIGGER trg_updated_payroll_entries
  BEFORE UPDATE ON payroll_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();