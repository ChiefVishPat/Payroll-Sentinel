-- Insert demo company
INSERT INTO companies (id, name, ein, state, check_company_id)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Payroll Sentinel', '12-3456789', 'NJ', 'cmp_o2vnibbq')
ON CONFLICT (id) DO NOTHING;

-- Insert demo employees
INSERT INTO employees (id, company_id, employee_number,
                       first_name, last_name, email, title, department,
                       annual_salary, employee_status,
                       business_unit_code, business_unit_name, date_of_birth, date_of_joining,
                       employment_category, grade, designation, continent)
VALUES
  ('550e8400-e29b-41d4-a716-446655440001',
   '550e8400-e29b-41d4-a716-446655440000', 'EMP001',
   'Vishal','Patel','vishal@payroll-sentinel.com','Software Engineer','Engineering',333333,'Inactive',
   'BU01','Engineering','1990-01-01','2020-06-15','Full-Time','S1','Engineer','North America'),
  ('550e8400-e29b-41d4-a716-446655440002',
   '550e8400-e29b-41d4-a716-446655440000', 'EMP002',
   'V','Money','vmoney@payroll-sentinel.com','CEO','Founder',999999,'Active',
   'BU02','Executive','1985-05-20','2018-01-10','Full-Time','E1','Chief Executive','North America'),
  ('550e8400-e29b-41d4-a716-446655440003',
   '550e8400-e29b-41d4-a716-446655440000', 'EMP003',
   'vish','pat','chiefvishpat@payroll-sentinel.com','Creative Director','Creativity',132137,'Active',
   'BU03','Creative','1992-09-09','2021-03-01','Contractor','C1','Director','Europe')
ON CONFLICT (id) DO NOTHING;

-- Seed a demo payroll run and entry showcasing salary components
INSERT INTO payroll_runs (id, company_id, run_number, pay_period_start, pay_period_end, pay_date, status, total_gross, total_net, total_taxes, total_deductions, employee_count)
VALUES ('550e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655440000', 'RUN001',
        '2024-07-01', '2024-07-15', '2024-07-20', 'processed', 1400000, 104500, 20000, 10000, 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO payroll_entries (id, payroll_run_id, employee_id, gross_pay, net_pay, taxes, deductions,
                            basic_salary, allowance, statutory_bonus, total_deductions, net_salary, tax_spend, reimbursement_paid)
VALUES ('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440100',
        '550e8400-e29b-41d4-a716-446655440001', 1400000, 104500, 20000, 10000,
        55725.24, 4785.05, 23508.9, 10000, 104500, 1251116, 3885797)
ON CONFLICT (id) DO NOTHING;
