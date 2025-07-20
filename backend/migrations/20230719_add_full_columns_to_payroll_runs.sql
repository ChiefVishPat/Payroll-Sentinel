-- Align payroll_runs table with canonical schema
-- Add missing columns
ALTER TABLE payroll_runs
  ADD COLUMN IF NOT EXISTS run_number TEXT;
ALTER TABLE payroll_runs
  ADD COLUMN IF NOT EXISTS pay_period_start DATE;
ALTER TABLE payroll_runs
  ADD COLUMN IF NOT EXISTS pay_period_end DATE;
ALTER TABLE payroll_runs
  ADD COLUMN IF NOT EXISTS total_gross NUMERIC(12,2) DEFAULT 0;
ALTER TABLE payroll_runs
  ADD COLUMN IF NOT EXISTS total_net NUMERIC(12,2) DEFAULT 0;
ALTER TABLE payroll_runs
  ADD COLUMN IF NOT EXISTS total_taxes NUMERIC(12,2) DEFAULT 0;
ALTER TABLE payroll_runs
  ADD COLUMN IF NOT EXISTS total_deductions NUMERIC(12,2) DEFAULT 0;
ALTER TABLE payroll_runs
  ADD COLUMN IF NOT EXISTS employee_count INTEGER DEFAULT 0;

-- Rename total_amount -> total_gross if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payroll_runs' AND column_name = 'total_amount'
  ) THEN
    UPDATE payroll_runs
      SET total_gross = COALESCE(total_amount, 0)
      WHERE total_gross = 0;
    ALTER TABLE payroll_runs DROP COLUMN total_amount;
  END IF;
END$$;

-- Set constraints and defaults
ALTER TABLE payroll_runs ALTER COLUMN run_number SET NOT NULL;
ALTER TABLE payroll_runs ALTER COLUMN pay_period_start SET NOT NULL;
ALTER TABLE payroll_runs ALTER COLUMN pay_period_end SET NOT NULL;
ALTER TABLE payroll_runs ALTER COLUMN pay_date SET NOT NULL;
ALTER TABLE payroll_runs ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE payroll_runs ALTER COLUMN status SET NOT NULL;

-- Ensure status check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payroll_runs_status_check'
      AND conrelid = 'payroll_runs'::regclass
  ) THEN
    ALTER TABLE payroll_runs
      ADD CONSTRAINT payroll_runs_status_check
        CHECK (status IN ('draft','pending','approved','processed','cancelled'));
  END IF;
END$$;

-- Ensure run_number uniqueness
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payroll_runs_run_number_key'
      AND conrelid = 'payroll_runs'::regclass
  ) THEN
    ALTER TABLE payroll_runs
      ADD CONSTRAINT payroll_runs_run_number_key UNIQUE (run_number);
  END IF;
END$$;

-- Log for migration runner
SELECT '[migration] payroll_runs columns ensured' AS info;
