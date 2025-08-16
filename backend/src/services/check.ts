/**
 * Check Service Mock
 * 
 * Simulates the Check API for payroll operations since the actual @checkhq/sdk
 * is not publicly available. Provides realistic payroll data structures and
 * business logic for demonstration purposes.
 */

import { BaseService, ServiceResponse, ServiceConfig } from './base';

// Check-specific types and interfaces
export interface CheckConfig extends ServiceConfig {
  apiKey: string;
  environment: 'sandbox' | 'production';
}

/**
 * Employee information for payroll
 */
export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeNumber?: string;
  department?: string;
  annualSalary?: number;
  hourlyRate?: number;
  businessUnitCode?: string;
  businessUnitName?: string;
  dateOfBirth?: string;
  dateOfJoining?: string;
  employmentCategory?: string;
  grade?: string;
  designation?: string;
  continent?: string;
  isActive: boolean;
}

/**
 * Payroll run information
 */
export interface PayrollRun {
  id: string;
  companyId: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  status: 'draft' | 'pending' | 'approved' | 'processed' | 'cancelled';
  totalGross: number;
  totalNet: number;
  totalTaxes: number;
  totalDeductions: number;
  employeeCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Individual payroll entry for an employee
 */
export interface PayrollEntry {
  id: string;
  payrollRunId: string;
  employeeId: string;
  grossPay: number;
  netPay: number;
  taxes: number;
  deductions: number;
  basicSalary?: number;
  allowance?: number;
  statutoryBonus?: number;
  totalDeductions?: number;
  netSalary?: number;
  taxSpend?: number;
  reimbursementPaid?: number;
  hours?: number;
  status: 'pending' | 'approved' | 'paid';
}

/**
 * Payroll schedule configuration
 */
export interface PayrollSchedule {
  id: string;
  companyId: string;
  frequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
  payDay: number; // Day of week (0-6) or day of month (1-31)
  nextPayDate: string;
  isActive: boolean;
}

/**
 * Payroll summary for cash flow projections
 */
export interface PayrollSummary {
  companyId: string;
  upcomingPayrolls: {
    payDate: string;
    estimatedAmount: number;
    employeeCount: number;
    status: 'scheduled' | 'draft' | 'pending';
  }[];
  lastPayrollAmount: number;
  averagePayrollAmount: number;
  nextPayrollDate: string;
}

/**
 * Mock Check service class implementing payroll operations
 */
export class CheckService extends BaseService {
  private readonly checkConfig: CheckConfig;
  
  // Mock data storage (in real implementation, this would be API calls)
  private mockPayrollRuns = new Map<string, PayrollRun>();
  // Mock data storage (in real implementation, this would be API calls)
  private mockCompanies = new Map<string, { name: string; ein: string; state: string }>();
  private mockEmployees = new Map<string, Employee>();
  private mockEntries = new Map<string, PayrollEntry[]>();

  constructor(config: CheckConfig) {
    super('check', config);
    this.checkConfig = config;
    
    // Validate required configuration
    this.validateConfig(['apiKey']);
    
    // Initialize with some mock data
    this.initializeMockData();
  }

  /**
   * Initialize mock data for demonstration
   */
  private initializeMockData(): void {
    // Mock employees
    const mockEmployees: Employee[] = [
      {
        id: 'emp_001',
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@company.com',
        employeeNumber: 'EMP001',
        department: 'Engineering',
        annualSalary: 95000,
        businessUnitCode: 'ENG',
        businessUnitName: 'Engineering',
        dateOfBirth: '1990-01-15',
        dateOfJoining: '2020-03-01',
        employmentCategory: 'Full Time',
        grade: 'G5',
        designation: 'Senior Engineer',
        continent: 'NA',
        isActive: true,
      },
      {
        id: 'emp_002',
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@company.com',
        employeeNumber: 'EMP002',
        department: 'Marketing',
        annualSalary: 75000,
        businessUnitCode: 'MKT',
        businessUnitName: 'Marketing',
        dateOfBirth: '1992-07-10',
        dateOfJoining: '2021-05-15',
        employmentCategory: 'Full Time',
        grade: 'G4',
        designation: 'Marketing Manager',
        continent: 'NA',
        isActive: true,
      },
      {
        id: 'emp_003',
        firstName: 'Mike',
        lastName: 'Davis',
        email: 'mike.davis@company.com',
        employeeNumber: 'EMP003',
        department: 'Operations',
        hourlyRate: 35,
        businessUnitCode: 'OPS',
        businessUnitName: 'Operations',
        dateOfBirth: '1988-04-20',
        dateOfJoining: '2019-08-01',
        employmentCategory: 'Contract',
        grade: 'G3',
        designation: 'Coordinator',
        continent: 'NA',
        isActive: true,
      },
    ];

    mockEmployees.forEach(emp => this.mockEmployees.set(emp.id, emp));
  }

  /**
   * Create a new company in the Check sandbox (mock implementation)
   * @param name - Legal company name
   * @param ein - Company EIN (tax ID)
   * @param state - Company state code (US)
   * @returns Service response containing the CheckHQ company ID
   */
    async createCompany(
      name: string,
      ein: string,
      state: string
  ): Promise<ServiceResponse<{ companyId: string }>> {
    return this.executeWithErrorHandling(async () => {
      // Simulate API delay
      await this.sleep(200);
      // Generate a mock CheckHQ company identifier
      const companyId = `cmp_${Math.random().toString(36).substring(2, 10)}`;
      this.mockCompanies.set(companyId, { name, ein, state });
      return { companyId };
    }, `create company ${name}`);
  }

  /**
   * Create a payroll schedule in the Check sandbox (mock)
   * @param companyId - Check company ID
   * @param frequency - Payroll frequency
   * @param firstPayday - First payday date (YYYY-MM-DD)
   */
  async createPaySchedule(
    companyId: string,
    frequency: string,
    firstPayday: string
  ): Promise<ServiceResponse<{ payScheduleId: string }>> {
    return this.executeWithErrorHandling(async () => {
      await this.sleep(200);
      const payScheduleId = `ps_${Math.random().toString(36).substring(2, 10)}`;
      return { payScheduleId };
    }, `create pay schedule for ${companyId}`);
  }

  /**
   * Run payroll in the Check sandbox (mock)
   * @param companyId - Check company ID
   * @param payScheduleId - Payroll schedule ID
   */
  async runPayroll(
    companyId: string,
    payScheduleId: string
  ): Promise<ServiceResponse<{ payrollRunId: string }>> {
    return this.executeWithErrorHandling(async () => {
      await this.sleep(300);
      const payrollRunId = `pr_${Math.random().toString(36).substring(2, 10)}`;
      return { payrollRunId };
    }, `run payroll for ${companyId}`);
  }

  /**
   * Poll payroll run status in the Check sandbox (mock)
   * @param payrollRunId - Payroll run ID
   */
  async getPayrollStatus(
    payrollRunId: string
  ): Promise<ServiceResponse<{ status: 'pending' | 'paid' }>> {
    return this.executeWithErrorHandling(async () => {
      await this.sleep(100);
      const status = 'paid';
      return { status };
    }, `get payroll status for ${payrollRunId}`);
  }

  /**
   * Get all employees for a company
   * @param companyId - Company identifier
   * @returns List of employees
   */
  async getEmployees(companyId: string): Promise<ServiceResponse<Employee[]>> {
    return this.executeWithErrorHandling(async () => {
      // Simulate API delay
      await this.sleep(100);
      
      const employees = Array.from(this.mockEmployees.values());
      return employees;
    }, `get employees for company ${companyId}`);
  }

  /**
   * Create a new payroll run
   * @param companyId - Company identifier
   * @param payPeriodStart - Start date of pay period
   * @param payPeriodEnd - End date of pay period
   * @param payDate - Date when employees will be paid
   * @returns Created payroll run
   */
  async createPayrollRun(
    companyId: string,
    payPeriodStart: string,
    payPeriodEnd: string,
    payDate: string
  ): Promise<ServiceResponse<PayrollRun>> {
    return this.executeWithErrorHandling(async () => {
      // Simulate API delay
      await this.sleep(200);
      
      const employees = Array.from(this.mockEmployees.values());
      
      // Calculate totals based on mock employee data
      let totalGross = 0;
      const entries: PayrollEntry[] = [];
      
      employees.forEach(employee => {
        let grossPay = 0;

        if (employee.annualSalary) {
          // Bi-weekly salary calculation
          grossPay = employee.annualSalary / 26;
        } else if (employee.hourlyRate) {
          // Assume 40 hours for hourly employees
          grossPay = employee.hourlyRate * 40;
        }

        // Basic salary breakdown using rough proportions
        const basicSalary = grossPay * 0.7;
        const allowance = grossPay * 0.2;
        const statutoryBonus = grossPay * 0.1;

        const taxes = grossPay * 0.25; // Simplified tax calculation
        const deductions = grossPay * 0.05; // Simplified deductions
        const netPay = grossPay - taxes - deductions;

        totalGross += grossPay;

        const entry: PayrollEntry = {
          id: `entry_${Date.now()}_${employee.id}`,
          payrollRunId: '', // Will be set after payroll run creation
          employeeId: employee.id,
          grossPay,
          netPay,
          taxes,
          deductions,
          basicSalary,
          allowance,
          statutoryBonus,
          totalDeductions: deductions,
          netSalary: netPay,
          taxSpend: taxes,
          reimbursementPaid: 0,
          status: 'pending',
        };

        if (employee.hourlyRate) {
          entry.hours = 40;
        }

        entries.push(entry);
      });
      
      const totalTaxes = entries.reduce((sum, entry) => sum + entry.taxes, 0);
      const totalDeductions = entries.reduce((sum, entry) => sum + entry.deductions, 0);
      const totalNet = entries.reduce((sum, entry) => sum + entry.netPay, 0);
      
      const payrollRun: PayrollRun = {
        id: `payroll_${Date.now()}`,
        companyId,
        payPeriodStart,
        payPeriodEnd,
        payDate,
        status: 'draft',
        totalGross,
        totalNet,
        totalTaxes,
        totalDeductions,
        employeeCount: employees.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Update entry payroll run IDs
      entries.forEach(entry => {
        entry.payrollRunId = payrollRun.id;
      });
      
      // Store in mock storage
      this.mockPayrollRuns.set(payrollRun.id, payrollRun);
      this.mockEntries.set(payrollRun.id, entries);
      
      return payrollRun;
    }, `create payroll run for company ${companyId}`);
  }

  /**
   * Get payroll run by ID
   * @param payrollRunId - Payroll run identifier
   * @returns Payroll run details
   */
  async getPayrollRun(payrollRunId: string): Promise<ServiceResponse<PayrollRun | null>> {
    return this.executeWithErrorHandling(async () => {
      // Simulate API delay
      await this.sleep(100);
      
      const payrollRun = this.mockPayrollRuns.get(payrollRunId);
      return payrollRun || null;
    }, `get payroll run ${payrollRunId}`);
  }

  /**
   * Get all payroll runs for a company
   * @param companyId - Company identifier
   * @param limit - Maximum number of results
   * @returns List of payroll runs
   */
  async getPayrollRuns(companyId: string, limit: number = 50): Promise<ServiceResponse<PayrollRun[]>> {
    return this.executeWithErrorHandling(async () => {
      // Simulate API delay
      await this.sleep(150);
      
      const payrollRuns = Array.from(this.mockPayrollRuns.values())
        .filter(run => run.companyId === companyId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
      
      return payrollRuns;
    }, `get payroll runs for company ${companyId}`);
  }

  /**
   * Approve a payroll run
   * @param payrollRunId - Payroll run identifier
   * @returns Updated payroll run
   */
  async approvePayrollRun(payrollRunId: string): Promise<ServiceResponse<PayrollRun>> {
    return this.executeWithErrorHandling(async () => {
      // Simulate API delay
      await this.sleep(300);
      
      const payrollRun = this.mockPayrollRuns.get(payrollRunId);
      if (!payrollRun) {
        throw new Error(`Payroll run ${payrollRunId} not found`);
      }
      
      if (payrollRun.status !== 'draft') {
        throw new Error(`Cannot approve payroll run with status: ${payrollRun.status}`);
      }
      
      // Update status
      payrollRun.status = 'approved';
      payrollRun.updatedAt = new Date().toISOString();
      
      // Update entries status
      const entries = this.mockEntries.get(payrollRunId) || [];
      entries.forEach(entry => {
        entry.status = 'approved';
      });
      
      this.mockPayrollRuns.set(payrollRunId, payrollRun);
      this.mockEntries.set(payrollRunId, entries);
      
      return payrollRun;
    }, `approve payroll run ${payrollRunId}`);
  }

  /**
   * Get upcoming payroll schedule for cash flow projections
   * @param companyId - Company identifier
   * @param monthsAhead - Number of months to project ahead
   * @returns Payroll summary with projections
   */
  async getPayrollSummary(companyId: string, monthsAhead: number = 3): Promise<ServiceResponse<PayrollSummary>> {
    return this.executeWithErrorHandling(async () => {
      // Simulate API delay
      await this.sleep(200);
      
      const recentPayrolls = Array.from(this.mockPayrollRuns.values())
        .filter(run => run.companyId === companyId)
        .sort((a, b) => new Date(b.payDate).getTime() - new Date(a.payDate).getTime());
      
      // Calculate average payroll amount
      const averagePayrollAmount = recentPayrolls.length > 0
        ? recentPayrolls.reduce((sum, run) => sum + run.totalGross, 0) / recentPayrolls.length
        : 50000; // Default estimate
      
      // Generate upcoming payroll projections (bi-weekly schedule)
      const upcomingPayrolls = [];
      const today = new Date();
      
      for (let i = 0; i < monthsAhead * 2; i++) { // Bi-weekly = 2 per month
        const payDate = new Date(today);
        payDate.setDate(today.getDate() + (i * 14)); // Every 14 days
        
        upcomingPayrolls.push({
          payDate: payDate.toISOString().split('T')[0]!,
          estimatedAmount: averagePayrollAmount * 1.02, // Slight growth assumption
          employeeCount: this.mockEmployees.size,
          status: 'scheduled' as const,
        });
      }
      
      const summary: PayrollSummary = {
        companyId,
        upcomingPayrolls,
        lastPayrollAmount: recentPayrolls[0]?.totalGross || 0,
        averagePayrollAmount,
        nextPayrollDate: upcomingPayrolls[0]?.payDate || '',
      };
      
      return summary;
    }, `get payroll summary for company ${companyId}`);
  }

  /**
   * Get the next scheduled payroll date and amount
   * @param companyId - Company identifier
   * @returns Next payroll information
   */
  async getNextPayroll(companyId: string): Promise<ServiceResponse<{
    payDate: string;
    estimatedAmount: number;
    employeeCount: number;
  }>> {
    return this.executeWithErrorHandling(async () => {
      const summary = await this.getPayrollSummary(companyId, 1);
      
      if (!summary.success || !summary.data?.upcomingPayrolls.length) {
        throw new Error('No upcoming payrolls found');
      }
      
      const nextPayroll = summary.data.upcomingPayrolls[0];
      if (!nextPayroll) {
        throw new Error('No upcoming payrolls found');
      }
      
      return {
        payDate: nextPayroll.payDate,
        estimatedAmount: nextPayroll.estimatedAmount,
        employeeCount: nextPayroll.employeeCount,
      };
    }, `get next payroll for company ${companyId}`);
  }

  /**
   * Get service configuration and status
   * @returns Service configuration information
   */
  public getServiceInfo(): {
    environment: string;
    configured: boolean;
    mockDataEnabled: boolean;
    employeeCount: number;
    payrollRunCount: number;
  } {
    return {
      environment: this.checkConfig.environment,
      configured: !!this.checkConfig.apiKey,
      mockDataEnabled: true,
      employeeCount: this.mockEmployees.size,
      payrollRunCount: this.mockPayrollRuns.size,
    };
  }
}
