// @ts-nocheck
import { FastifyInstance } from 'fastify';
import { 
  handleRoute, 
  validateRequired, 
  validateString,
  mapServiceError 
} from '@backend/routes/helpers';
import { CheckService } from '@backend/services/check';
import { PlaidService } from '@backend/services/plaid';
import DatabaseService from '@backend/config/database';

async function mockDataRoutes(fastify: FastifyInstance) {
  const checkService = new CheckService({
    apiKey: process.env.CHECK_API_KEY || 'demo-api-key',
    environment: 'sandbox'
  });

  const plaidService = new PlaidService({
    clientId: process.env.PLAID_CLIENT_ID || 'default-client-id',
    secret: process.env.PLAID_SECRET || 'default-secret',
    environment: (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production'
  });
  
  /**
   * Generate complete mock dataset
   * POST /api/mock-data/generate
   * Body: { companyId }
   */
  fastify.post('/mock-data/generate', handleRoute(async (request, _reply) => {
    const body = request.body as any;
    
    validateRequired(body.companyId, 'companyId');
    const companyId = validateString(body.companyId, 'companyId');
    
    try {
      // Generate employees
      const employeesResponse = await checkService.getEmployees({ companyId, active: true });
      if (!employeesResponse.success) {
        throw new Error('Failed to initialize employee data');
      }
      
      // Create a sample payroll run
      const today = new Date();
      const payPeriodStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const payPeriodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const payDate = new Date(today.getFullYear(), today.getMonth() + 1, 5);
      
      const payrollResponse = await checkService.createPayrollRun(
        companyId,
        payPeriodStart.toISOString(),
        payPeriodEnd.toISOString(),
        payDate.toISOString()
      );
      
      if (!payrollResponse.success) {
        throw new Error('Failed to create sample payroll');
      }
      
      // Get payroll summary
      const summaryResponse = await checkService.getPayrollSummary(companyId);
      
      return {
        success: true,
        message: 'Mock data generated successfully',
        data: {
          employees: {
            count: employeesResponse.data?.items?.length || 0,
            departments: ['Engineering', 'Marketing', 'Operations'],
            totalSalaries: 270000
          },
          payroll: {
            runs: 1,
            totalAmount: payrollResponse.data?.totalGross || 0,
            lastRun: payrollResponse.data?.createdAt,
            nextRun: payDate.toISOString()
          },
          banking: {
            accounts: 0, // Will be populated when Plaid is connected
            totalBalance: 0,
            connected: false
          },
          summary: summaryResponse.data
        }
      };
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get mock data status
   * GET /api/mock-data/status
   * Query params: companyId
   */
  fastify.get('/mock-data/status', handleRoute(async (request, _reply) => {
    const query = request.query as any;
    
    validateRequired(query.companyId, 'companyId');
    const companyId = validateString(query.companyId, 'companyId');
    
    try {
      const employeesResponse = await checkService.getEmployees({ companyId });
      const payrollResponse = await checkService.getPayrollRuns(companyId, 10);
      
      return {
        success: true,
        data: {
          hasEmployees: (employeesResponse.data?.items?.length || 0) > 0,
          hasPayroll: (payrollResponse.data?.length || 0) > 0,
          employeeCount: employeesResponse.data?.items?.length || 0,
          payrollRunCount: payrollResponse.data?.length || 0,
          lastGenerated: new Date().toISOString()
        }
      };
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Clear mock data
   * DELETE /api/mock-data/clear
   * Body: { companyId }
   */
  fastify.delete('/mock-data/clear', handleRoute(async (request, _reply) => {
    const body = request.body as any;
    
    validateRequired(body.companyId, 'companyId');
    validateString(body.companyId, 'companyId');
    
    try {
      // Note: In the current mock implementation, we can't actually clear data
      // This would be implemented in a real database-backed system
      
      return {
        success: true,
        message: 'Mock data cleared successfully (simulated)'
      };
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Test database connection
   * GET /api/mock-data/test-db
   */
  fastify.get('/mock-data/test-db', handleRoute(async (_request, _reply) => {
    try {
      const db = DatabaseService.getInstance();
      const client = db.getClient();
      
      // Test basic database connection
      const { data: companies, error } = await client
        .from('companies')
        .select('*')
        .limit(5);
      
      if (error) {
        return {
          success: false,
          error: error.message,
          connection: 'failed'
        };
      }
      
      return {
        success: true,
        connection: 'working',
        companies: companies || [],
        message: 'Database connection successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        connection: 'failed'
      };
    }
  }));
  
  /**
   * Setup sample data in database
   * POST /api/mock-data/setup-db
   * Body: { companyName?, companyId? }
   */
  fastify.post('/mock-data/setup-db', handleRoute(async (request, _reply) => {
    const body = request.body as any;
    
    try {
      const db = DatabaseService.getInstance();
      const client = db.getClient();
      
      const companyName = body.companyName || 'Acme Corp';
      const companyId = body.companyId || '550e8400-e29b-41d4-a716-446655440000';
      
      // Insert sample company
      const { data: company, error: companyError } = await client
        .from('companies')
        .upsert({
          id: companyId,
          name: companyName,
          industry: 'Technology',
          size: 'Medium'
        })
        .select()
        .single();
      
      if (companyError) {
        throw new Error(`Failed to create company: ${companyError.message}`);
      }
      
      // Insert sample employees
      const employees = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          company_id: companyId,
          employee_number: 'EMP001',
          first_name: 'John',
          last_name: 'Smith',
          email: 'john.smith@' + companyName.toLowerCase().replace(/\s+/g, '') + '.com',
          department: 'Engineering',
          annual_salary: 75000,
          is_active: true
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          company_id: companyId,
          employee_number: 'EMP002',
          first_name: 'Jane',
          last_name: 'Doe',
          email: 'jane.doe@' + companyName.toLowerCase().replace(/\s+/g, '') + '.com',
          department: 'Marketing',
          annual_salary: 65000,
          is_active: true
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440003',
          company_id: companyId,
          employee_number: 'EMP003',
          first_name: 'Bob',
          last_name: 'Johnson',
          email: 'bob.johnson@' + companyName.toLowerCase().replace(/\s+/g, '') + '.com',
          department: 'Operations',
          annual_salary: 70000,
          is_active: true
        }
      ];
      
      const { data: insertedEmployees, error: employeeError } = await client
        .from('employees')
        .upsert(employees)
        .select();
      
      if (employeeError) {
        throw new Error(`Failed to create employees: ${employeeError.message}`);
      }
      
      return {
        success: true,
        message: 'Database setup completed successfully',
        data: {
          company,
          employees: insertedEmployees,
          companyId
        }
      };
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
}

export default mockDataRoutes;
// @ts-nocheck
