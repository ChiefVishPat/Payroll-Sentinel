-- Insert demo company
INSERT INTO companies (id, name, ein, state, check_company_id)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Payroll Sentinel', '12-3456789', 'NJ', 'cmp_o2vnibbq')
ON CONFLICT (id) DO NOTHING;

-- Insert demo employees
INSERT INTO employees (id, company_id, employee_number,
                       first_name, last_name, email, department,
                       annual_salary, is_active)
VALUES
  ('550e8400-e29b-41d4-a716-446655440001',
   '550e8400-e29b-41d4-a716-446655440000', 'EMP001',
   'Vishal','Patel','vishal@payroll-sentinel.com','Engineering',333333,TRUE),
  ('550e8400-e29b-41d4-a716-446655440002',
   '550e8400-e29b-41d4-a716-446655440000', 'EMP002',
   'V','Money','vmoney@payroll-sentinel.com','Founder',999999,TRUE),
  ('550e8400-e29b-41d4-a716-446655440003',
   '550e8400-e29b-41d4-a716-446655440000', 'EMP003',
   'vish','pat','chiefvishpat@payroll-sentinel.com','Creativity',132137,TRUE)
ON CONFLICT (id) DO NOTHING;
