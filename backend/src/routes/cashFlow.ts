// @ts-nocheck
import { FastifyInstance } from 'fastify';
import { 
  handleRoute,
  validateDate,
  validateNumber,
  validateString,
  parsePagination,
  formatPaginatedResponse,
  mapServiceError,
  resolveCompanyId
} from './helpers.js';
import { CashFlowAnalysisService } from '../services/cashflow.js';
import { PlaidService } from '../services/plaid.js';
import DatabaseCheckService from '../services/database/check.js';
import { ApiError, ErrorType } from '../middleware/index.js';

// Removed unused interface

interface CashFlowFilters {
  companyId?: string;
  startDate?: Date;
  endDate?: Date;
  accountId?: string;
  includeProjections?: boolean;
}

async function cashFlowRoutes(fastify: FastifyInstance) {
  // Create service instances with default configurations
  const plaidService = new PlaidService({
    clientId: process.env.PLAID_CLIENT_ID || 'default-client-id',
    secret: process.env.PLAID_SECRET || 'default-secret',
    environment: (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production'
  });
  
  const checkService = new DatabaseCheckService();
  
  const cashFlowService = new CashFlowAnalysisService(
    {
      environment: (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production'
    },
    plaidService,
    checkService
  );
  
  /**
   * Get current cash flow analysis
   * GET /api/cash-flow
   * Query params: companyId, startDate, endDate, includeProjections, page, limit
   */
  fastify.get('/cash-flow', handleRoute(async (request, _reply) => {
    const query = request.query as any;
    const pagination = parsePagination(query);
    
    // Validate required parameters
    const companyId = await resolveCompanyId(query.companyId);
    
    // Parse optional filters
    const filters: CashFlowFilters = {
      companyId,
      includeProjections: query.includeProjections === 'true'
    };
    
    if (query.startDate) {
      filters.startDate = validateDate(query.startDate, 'startDate');
    }
    
    if (query.endDate) {
      filters.endDate = validateDate(query.endDate, 'endDate');
    }
    
    if (query.accountId) {
      filters.accountId = validateString(query.accountId, 'accountId');
    }
    
    try {
      const result = await cashFlowService.getCurrentAnalysis(filters, pagination);
      return formatPaginatedResponse(result.data || [], result.data ? result.data.length : 0, pagination);
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get cash flow projections
   * GET /api/cash-flow/projections
   * Query params: companyId, daysAhead, includePayroll
   */
  fastify.get('/cash-flow/projections', handleRoute(async (request, _reply) => {
    const query = request.query as any;
    
    const companyId = await resolveCompanyId(query.companyId);
    
    const daysAhead = query.daysAhead ? validateNumber(query.daysAhead, 'daysAhead') : 30;
    const includePayroll = query.includePayroll === 'true';
    
    try {
      const projections = await cashFlowService.getProjections(companyId, {
        daysAhead,
        includePayroll
      });
      
      return projections;
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get cash flow summary for a specific period
   * GET /api/cash-flow/summary
   * Query params: companyId, startDate, endDate
   */
  fastify.get('/cash-flow/summary', handleRoute(async (request, _reply) => {
    const query = request.query as any;
    
    const companyId = await resolveCompanyId(query.companyId);
    
    const startDate = query.startDate ? validateDate(query.startDate, 'startDate') : undefined;
    const endDate = query.endDate ? validateDate(query.endDate, 'endDate') : undefined;
    
    try {
      const summary = await cashFlowService.getSummary(companyId, { startDate, endDate });
      return summary;
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Trigger cash flow recalculation
   * POST /api/cash-flow/recalculate
   * Body: { companyId, forceRefresh? }
   */
  fastify.post('/cash-flow/recalculate', handleRoute(async (request, _reply) => {
    const body = request.body as any;
    
    const companyId = await resolveCompanyId(body.companyId);
    const forceRefresh = body.forceRefresh === true;
    
    try {
      const result = await cashFlowService.recalculateAnalysis(companyId, { forceRefresh });
      return {
        success: true,
        message: 'Cash flow analysis recalculation initiated',
        jobId: result.data ? 'recalc-job-id' : undefined,
        estimatedCompletion: result.data ? new Date(Date.now() + 10 * 60 * 1000).toISOString() : undefined
      };
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get cash flow by account
   * GET /api/cash-flow/accounts/:accountId
   * Path params: accountId
   * Query params: startDate, endDate, includeTransactions
   */
  fastify.get('/cash-flow/accounts/:accountId', handleRoute(async (request, _reply) => {
    const params = request.params as any;
    const query = request.query as any;
    
    const accountId = validateString(params.accountId, 'accountId');
    const startDate = query.startDate ? validateDate(query.startDate, 'startDate') : undefined;
    const endDate = query.endDate ? validateDate(query.endDate, 'endDate') : undefined;
    const includeTransactions = query.includeTransactions === 'true';
    
    try {
      const accountCashFlow = await cashFlowService.getAccountCashFlow(accountId, {
        startDate,
        endDate,
        includeTransactions
      });
      
      return accountCashFlow;
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get cash flow trends
   * GET /api/cash-flow/trends
   * Query params: companyId, period (daily, weekly, monthly), daysBack
   */
  fastify.get('/cash-flow/trends', handleRoute(async (request, _reply) => {
    const query = request.query as any;
    
    const companyId = await resolveCompanyId(query.companyId);
    
    const period = query.period || 'daily';
    const validPeriods = ['daily', 'weekly', 'monthly'];
    if (!validPeriods.includes(period)) {
      throw new ApiError(
        ErrorType.VALIDATION_ERROR,
        `Invalid period. Must be one of: ${validPeriods.join(', ')}`,
        400
      );
    }
    
    const daysBack = query.daysBack ? validateNumber(query.daysBack, 'daysBack') : 30;
    
    try {
      const trends = await cashFlowService.getTrends(companyId, { period, daysBack });
      return trends;
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get cash flow alerts
   * GET /api/cash-flow/alerts
   * Query params: companyId, severity, active
   */
  fastify.get('/cash-flow/alerts', handleRoute(async (request, _reply) => {
    const query = request.query as any;
    
    const companyId = await resolveCompanyId(query.companyId);
    
    const severity = query.severity; // low, medium, high
    const activeOnly = query.active !== 'false'; // default to true
    
    try {
      const alerts = await cashFlowService.getAlerts(companyId, { 
        severity, 
        activeOnly 
      });
      
      return alerts;
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Create cash flow snapshot
   * POST /api/cash-flow/snapshot
   * Body: { companyId, description? }
   */
  fastify.post('/cash-flow/snapshot', handleRoute(async (request, _reply) => {
    const body = request.body as any;
    
    const companyId = await resolveCompanyId(body.companyId);
    const description = body.description ? validateString(body.description, 'description') : undefined;
    
    try {
      const snapshot = await cashFlowService.createSnapshot(companyId, { description });
      return {
        success: true,
        message: 'Cash flow snapshot created successfully',
        snapshot
      };
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get cash flow snapshots
   * GET /api/cash-flow/snapshots
   * Query params: companyId, limit
   */
  fastify.get('/cash-flow/snapshots', handleRoute(async (request, _reply) => {
    const query = request.query as any;
    
    const companyId = await resolveCompanyId(query.companyId);
    const limit = query.limit ? validateNumber(query.limit, 'limit') : 10;
    
    try {
      const snapshots = await cashFlowService.getSnapshots(companyId, { limit });
      return snapshots;
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
}

export default cashFlowRoutes;
// @ts-nocheck
