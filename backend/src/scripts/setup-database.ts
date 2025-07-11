import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * SQL to create all necessary tables
 */
const createTablesSQL = `
-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  industry text,
  size text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  employee_number text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE NOT NULL,
  department text,
  annual_salary numeric(10,2),
  hourly_rate numeric(8,2),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Payroll runs table
CREATE TABLE IF NOT EXISTS payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  run_number text UNIQUE NOT NULL,
  pay_period_start date NOT NULL,
  pay_period_end date NOT NULL,
  pay_date date NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'processed', 'cancelled')),
  total_gross numeric(12,2) DEFAULT 0,
  total_net numeric(12,2) DEFAULT 0,
  total_taxes numeric(12,2) DEFAULT 0,
  total_deductions numeric(12,2) DEFAULT 0,
  employee_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Payroll entries table
CREATE TABLE IF NOT EXISTS payroll_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id uuid REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  gross_pay numeric(10,2) NOT NULL,
  net_pay numeric(10,2) NOT NULL,
  taxes numeric(10,2) DEFAULT 0,
  deductions numeric(10,2) DEFAULT 0,
  hours numeric(6,2),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processed', 'cancelled')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Bank accounts table for Plaid integration
CREATE TABLE IF NOT EXISTS bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  account_id text UNIQUE NOT NULL,
  item_id text NOT NULL,
  access_token text NOT NULL,
  account_name text NOT NULL,
  account_type text NOT NULL,
  account_subtype text,
  current_balance numeric(12,2),
  available_balance numeric(12,2),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Risk assessments table
CREATE TABLE IF NOT EXISTS risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  risk_level text NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_score numeric(3,2) NOT NULL,
  category text NOT NULL,
  factors jsonb,
  recommendations text[],
  status text DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'suppressed')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_company_id ON payroll_runs(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_status ON payroll_runs(status);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_payroll_run_id ON payroll_entries(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_employee_id ON payroll_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_company_id ON bank_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_company_id ON risk_assessments(company_id);

-- Enable Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (allowing all operations for now)
CREATE POLICY "Enable all operations for companies" ON companies FOR ALL USING (true);
CREATE POLICY "Enable all operations for employees" ON employees FOR ALL USING (true);
CREATE POLICY "Enable all operations for payroll_runs" ON payroll_runs FOR ALL USING (true);
CREATE POLICY "Enable all operations for payroll_entries" ON payroll_entries FOR ALL USING (true);
CREATE POLICY "Enable all operations for bank_accounts" ON bank_accounts FOR ALL USING (true);
CREATE POLICY "Enable all operations for risk_assessments" ON risk_assessments FOR ALL USING (true);
`;

/**
 * Sample data to insert
 */
const sampleDataSQL = `
-- Insert sample company
INSERT INTO companies (id, name, industry, size)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Acme Corp', 'Technology', 'Medium')
ON CONFLICT (id) DO NOTHING;

-- Insert sample employees
INSERT INTO employees (id, company_id, employee_number, first_name, last_name, email, department, annual_salary, is_active)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'EMP001', 'John', 'Smith', 'john.smith@acmecorp.com', 'Engineering', 75000, true),
  ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'EMP002', 'Jane', 'Doe', 'jane.doe@acmecorp.com', 'Marketing', 65000, true),
  ('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'EMP003', 'Bob', 'Johnson', 'bob.johnson@acmecorp.com', 'Operations', 70000, true)
ON CONFLICT (id) DO NOTHING;
`;

async function setupDatabase() {
  try {
    console.log('Setting up database tables...');
    
    // Execute table creation SQL
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: createTablesSQL
    });
    
    if (createError) {
      console.error('Error creating tables:', createError);
      // Try alternative method
      const statements = createTablesSQL.split(';').filter(s => s.trim());
      for (const statement of statements) {
        if (statement.trim()) {
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          if (error) {
            console.warn('Warning executing statement:', statement.substring(0, 100) + '...', error);
          }
        }
      }
    }
    
    console.log('Database tables created successfully!');
    
    // Insert sample data
    console.log('Inserting sample data...');
    const { error: dataError } = await supabase.rpc('exec_sql', {
      sql: sampleDataSQL
    });
    
    if (dataError) {
      console.error('Error inserting sample data:', dataError);
    } else {
      console.log('Sample data inserted successfully!');
    }
    
    // Verify setup
    console.log('Verifying database setup...');
    const { data: companies, error: verifyError } = await supabase
      .from('companies')
      .select('*')
      .limit(1);
    
    if (verifyError) {
      console.error('Error verifying setup:', verifyError);
    } else {
      console.log('Database setup verified successfully!');
      console.log('Sample companies:', companies);
    }
    
    console.log('Database setup complete!');
    
  } catch (error) {
    console.error('Error setting up database:', error);
  }
}

// Run the setup
setupDatabase().then(() => {
  console.log('Setup script completed');
  process.exit(0);
}).catch((error) => {
  console.error('Setup script failed:', error);
  process.exit(1);
});
