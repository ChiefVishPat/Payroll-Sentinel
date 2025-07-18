-- Ensure payroll_entries table has all required columns
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS net_pay NUMERIC(10,2);
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS taxes NUMERIC(10,2) DEFAULT 0;
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS deductions NUMERIC(10,2) DEFAULT 0;
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS hours NUMERIC(6,2);
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','processed','cancelled'));

