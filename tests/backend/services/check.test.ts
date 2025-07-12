import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CheckService, CheckConfig, Employee, PayrollRun, PayrollSummary } from '@backend/services/check';

describe('CheckService', () => {
  let service: CheckService;
  const mockConfig: CheckConfig = {
    apiKey: 'test-api-key',
    environment: 'sandbox',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CheckService(mockConfig);
  });

  describe('Constructor', () => {
    it('should initialize with valid config', () => {
      expect(() => new CheckService(mockConfig)).not.toThrow();
    });

    it('should throw error for missing apiKey', () => {
      const invalidConfig = { environment: 'sandbox' } as CheckConfig;
      
      expect(() => new CheckService(invalidConfig)).toThrow(
        'Missing required configuration for check: apiKey'
      );
    });

    it('should return health status', () => {
      const status = service.getHealthStatus();
      
      expect(status).toEqual({
        service: 'check',
        status: 'configured',
        environment: 'sandbox',
        lastChecked: expect.any(String),
      });
    });
  });

  describe('getEmployees', () => {
    it('should return mock employees successfully', async () => {
      const result = await service.getEmployees('company_123');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);
      
      // Check employee structure
      const employee = result.data![0];
      expect(employee).toMatchObject({
        id: expect.any(String),
        firstName: expect.any(String),
        lastName: expect.any(String),
        email: expect.any(String),
        isActive: expect.any(Boolean),
      });
    });

    it('should include metadata in response', async () => {
      const result = await service.getEmployees('company_123');

      expect(result.metadata).toMatchObject({
        requestId: expect.any(String),
        timestamp: expect.any(String),
        service: 'check',
      });
    });

    it('should return employees with salary and hourly rate data', async () => {
      const result = await service.getEmployees('company_123');
      const employees = result.data!;

      // Should have both salary and hourly employees
      const salaryEmployee = employees.find(emp => emp.annualSalary);
      const hourlyEmployee = employees.find(emp => emp.hourlyRate);

      expect(salaryEmployee).toBeDefined();
      expect(hourlyEmployee).toBeDefined();
      expect(salaryEmployee?.annualSalary).toBeGreaterThan(0);
      expect(hourlyEmployee?.hourlyRate).toBeGreaterThan(0);
    });
  });

  describe('createPayrollRun', () => {
    it('should create payroll run successfully', async () => {
      const payPeriodStart = '2024-01-01';
      const payPeriodEnd = '2024-01-15';
      const payDate = '2024-01-20';

      const result = await service.createPayrollRun(
        'company_123',
        payPeriodStart,
        payPeriodEnd,
        payDate
      );

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        id: expect.any(String),
        companyId: 'company_123',
        payPeriodStart,
        payPeriodEnd,
        payDate,
        status: 'draft',
        totalGross: expect.any(Number),
        totalNet: expect.any(Number),
        totalTaxes: expect.any(Number),
        totalDeductions: expect.any(Number),
        employeeCount: expect.any(Number),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('should calculate payroll amounts correctly', async () => {
      const result = await service.createPayrollRun(
        'company_123',
        '2024-01-01',
        '2024-01-15',
        '2024-01-20'
      );

      const payrollRun = result.data!;
      
      // Total net should be less than total gross due to taxes/deductions
      expect(payrollRun.totalNet).toBeLessThan(payrollRun.totalGross);
      expect(payrollRun.totalTaxes).toBeGreaterThan(0);
      expect(payrollRun.totalDeductions).toBeGreaterThan(0);
      
      // Check calculation consistency
      const calculatedNet = payrollRun.totalGross - payrollRun.totalTaxes - payrollRun.totalDeductions;
      expect(Math.abs(payrollRun.totalNet - calculatedNet)).toBeLessThan(0.01);
    });

    it('should handle employee count correctly', async () => {
      const employeesResult = await service.getEmployees('company_123');
      const expectedEmployeeCount = employeesResult.data!.length;

      const payrollResult = await service.createPayrollRun(
        'company_123',
        '2024-01-01',
        '2024-01-15',
        '2024-01-20'
      );

      expect(payrollResult.data!.employeeCount).toBe(expectedEmployeeCount);
    });
  });

  describe('getPayrollRuns', () => {
    it('should return empty array when no payroll runs exist', async () => {
      const result = await service.getPayrollRuns('company_123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should return created payroll runs', async () => {
      // Create a payroll run first
      await service.createPayrollRun('company_123', '2024-01-01', '2024-01-15', '2024-01-20');
      
      const result = await service.getPayrollRuns('company_123');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBe(1);
      expect(result.data![0]).toMatchObject({
        companyId: 'company_123',
        status: 'draft',
      });
    });

    it('should return multiple payroll runs in order', async () => {
      // Create multiple payroll runs
      await service.createPayrollRun('company_123', '2024-01-01', '2024-01-15', '2024-01-20');
      await service.createPayrollRun('company_123', '2024-01-16', '2024-01-31', '2024-02-05');
      
      const result = await service.getPayrollRuns('company_123');

      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(2);
      
      // Should be ordered by creation date (most recent first)
      const payrolls = result.data!;
      expect(new Date(payrolls[0].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(payrolls[1].createdAt).getTime()
      );
    });
  });

  describe('approvePayroll', () => {
    it('should approve draft payroll successfully', async () => {
      // Create a payroll run first
      const createResult = await service.createPayrollRun(
        'company_123',
        '2024-01-01',
        '2024-01-15',
        '2024-01-20'
      );
      const payrollId = createResult.data!.id;

      const result = await service.approvePayrollRun(payrollId);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        id: payrollId,
        status: 'approved',
        updatedAt: expect.any(String),
      });
    });

    it('should fail to approve non-existent payroll', async () => {
      const result = await service.approvePayrollRun('non_existent_id');

      expect(result.success).toBe(false);
      expect(result.error).toMatchObject({
        code: 'UNKNOWN_ERROR',
        message: 'Payroll run non_existent_id not found',
        retryable: false,
      });
    });

    it('should fail to approve already approved payroll', async () => {
      // Create and approve a payroll run
      const createResult = await service.createPayrollRun(
        'company_123',
        '2024-01-01',
        '2024-01-15',
        '2024-01-20'
      );
      const payrollId = createResult.data!.id;
      await service.approvePayrollRun(payrollId);

      // Try to approve again
      const result = await service.approvePayrollRun(payrollId);

      expect(result.success).toBe(false);
      expect(result.error).toMatchObject({
        code: 'UNKNOWN_ERROR',
        message: 'Cannot approve payroll run with status: approved',
        retryable: false,
      });
    });
  });

  describe('getPayrollSummary', () => {
    it('should return summary with no payrolls initially', async () => {
      const result = await service.getPayrollSummary('company_123');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        companyId: 'company_123',
        upcomingPayrolls: expect.any(Array),
        lastPayrollAmount: 0,
        averagePayrollAmount: expect.any(Number),
        nextPayrollDate: expect.any(String),
      });
      
      // Should have upcoming payrolls generated
      expect(result.data!.upcomingPayrolls.length).toBeGreaterThan(0);
    });

    it('should calculate summary with existing payrolls', async () => {
      // Create some payroll runs
      const payroll1 = await service.createPayrollRun(
        'company_123',
        '2024-01-01',
        '2024-01-15',
        '2024-01-20'
      );
      const payroll2 = await service.createPayrollRun(
        'company_123',
        '2024-01-16',
        '2024-01-31',
        '2024-02-05'
      );

      await service.approvePayrollRun(payroll1.data!.id);

      const result = await service.getPayrollSummary('company_123');

      expect(result.success).toBe(true);
      expect(result.data!.upcomingPayrolls.length).toBeGreaterThan(0);
      expect(result.data!.lastPayrollAmount).toBeGreaterThan(0);
      expect(result.data!.averagePayrollAmount).toBeGreaterThan(0);
    });

    it('should include scheduled payrolls in upcoming list', async () => {
      // Create future payroll runs
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      await service.createPayrollRun(
        'company_123',
        '2024-01-01',
        '2024-01-15',
        futureDateStr
      );

      const result = await service.getPayrollSummary('company_123');

      expect(result.success).toBe(true);
      expect(result.data!.upcomingPayrolls.length).toBeGreaterThan(0);
      expect(result.data!.upcomingPayrolls[0]).toMatchObject({
        payDate: expect.any(String),
        estimatedAmount: expect.any(Number),
        employeeCount: expect.any(Number),
        status: 'scheduled',
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service configuration validation', () => {
      expect(() => {
        new CheckService({ environment: 'sandbox' } as CheckConfig);
      }).toThrow();
    });

    it('should return structured error responses', async () => {
      const result = await service.approvePayrollRun('invalid_id');

      expect(result.success).toBe(false);
      expect(result.error).toMatchObject({
        code: expect.any(String),
        message: expect.any(String),
        retryable: expect.any(Boolean),
      });
      expect(result.metadata).toMatchObject({
        requestId: expect.any(String),
        timestamp: expect.any(String),
        service: 'check',
      });
    });
  });

  describe('Mock Data Integrity', () => {
    it('should maintain consistent employee data', async () => {
      const result1 = await service.getEmployees('company_123');
      const result2 = await service.getEmployees('company_123');

      expect(result1.data).toEqual(result2.data);
    });

    it('should generate realistic employee data', async () => {
      const result = await service.getEmployees('company_123');
      const employees = result.data!;

      // Check for realistic data
      employees.forEach(employee => {
        expect(employee.firstName).toMatch(/^[A-Za-z]+$/);
        expect(employee.lastName).toMatch(/^[A-Za-z]+$/);
        expect(employee.email).toMatch(/^[^@]+@[^@]+\.[^@]+$/);
        
        if (employee.annualSalary) {
          expect(employee.annualSalary).toBeGreaterThan(30000);
          expect(employee.annualSalary).toBeLessThan(200000);
        }
        
        if (employee.hourlyRate) {
          expect(employee.hourlyRate).toBeGreaterThan(15);
          expect(employee.hourlyRate).toBeLessThan(100);
        }
      });
    });
  });
});
