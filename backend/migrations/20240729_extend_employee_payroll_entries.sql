-- Extend employees with HR metadata
ALTER TABLE employees ADD COLUMN IF NOT EXISTS business_unit_code TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS business_unit_name TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS date_of_joining DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employment_category TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS grade TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS continent TEXT;
-- Replace legacy is_active flag with employee_status from CSV
ALTER TABLE employees DROP COLUMN IF EXISTS is_active;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_status TEXT DEFAULT 'Active';
DROP INDEX IF EXISTS idx_employees_active;
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(employee_status);

-- Extend payroll_entries with salary breakdown
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS basic_salary NUMERIC(10,2) DEFAULT 0;
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS allowance NUMERIC(10,2) DEFAULT 0;
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS statutory_bonus NUMERIC(10,2) DEFAULT 0;
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS total_deductions NUMERIC(10,2) DEFAULT 0;
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS net_salary NUMERIC(10,2) DEFAULT 0;
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS tax_spend NUMERIC(10,2) DEFAULT 0;
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS reimbursement_paid NUMERIC(10,2) DEFAULT 0;
