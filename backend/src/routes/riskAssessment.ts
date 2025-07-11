// @ts-nocheck
import { FastifyInstance } from 'fastify';
import { 
  handleRoute,
  validateRequired,
  validateString,
  validateDate,
  validateNumber,
  validateEnum,
  parsePagination,
  formatPaginatedResponse,
  mapServiceError,
  resolveCompanyId
} from './helpers.js';
// import { RiskAssessmentService } from '../services/riskAssessment.js';

interface RiskFilters {
  companyId?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  status?: 'active' | 'resolved' | 'suppressed';
  startDate?: Date;
  endDate?: Date;
}

async function riskAssessmentRoutes(fastify: FastifyInstance) {
  // Services will be available after decoration, but we'll check in each route
  const getRiskEngine = () => {
    const services = (fastify as any).services;
    if (!services || !services.riskEngine) {
      throw new Error('Risk engine service not available');
    }
    return services.riskEngine;
  };
  
  /**
   * Get current risk status overview
   * GET /api/risk/status
   * Query params: companyId
   */
  fastify.get('/risk/status', handleRoute(async (request, _reply) => {
    const query = request.query as any;
    
    const companyId = await resolveCompanyId(query.companyId);
    
    try {
      const riskEngine = getRiskEngine();
      const assessment = await riskEngine.assessRisk(companyId);
      if (!assessment.success) {
        throw new Error(assessment.error?.message || 'Risk assessment failed');
      }
      return assessment.data;
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get all risk assessments with filtering and pagination
   * GET /api/risk/assessments
   * Query params: companyId, riskLevel, category, status, startDate, endDate, page, limit
   */
  fastify.get('/risk/assessments', handleRoute(async (request, _reply) => {
    const query = request.query as any;
    const pagination = parsePagination(query);
    
    const companyId = await resolveCompanyId(query.companyId);
    
    const filters: RiskFilters = { companyId };
    
    if (query.riskLevel) {
      filters.riskLevel = validateEnum(
        query.riskLevel,
        'riskLevel',
        ['low', 'medium', 'high', 'critical']
      ) as 'low' | 'medium' | 'high' | 'critical';
    }
    
    if (query.category) {
      filters.category = validateString(query.category, 'category');
    }
    
    if (query.status) {
      filters.status = validateEnum(
        query.status, 
        'status', 
        ['active', 'resolved', 'suppressed']
      ) as 'active' | 'resolved' | 'suppressed';
    }
    
    if (query.startDate) {
      filters.startDate = validateDate(query.startDate, 'startDate');
    }
    
    if (query.endDate) {
      filters.endDate = validateDate(query.endDate, 'endDate');
    }
    
    try {
      const riskEngine = getRiskEngine();
      const result = await riskEngine.getHistoricalRisk(companyId, 30);
      if (!result.success || !result.data) {
        throw new Error('Failed to fetch risk assessments');
      }
      return formatPaginatedResponse(result.data, result.data.length, pagination);
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get specific risk assessment details
   * GET /api/risk/assessments/:assessmentId
   * Path params: assessmentId
   */
  fastify.get('/risk/assessments/:assessmentId', handleRoute(async (request, _reply) => {
    const params = request.params as any;
    
    const assessmentId = validateString(params.assessmentId, 'assessmentId');
    
    try {
      // For now, just return current assessment
      const riskEngine = getRiskEngine();
      const assessment = await riskEngine.assessRisk(assessmentId);
      if (!assessment.success) {
        throw new Error(assessment.error?.message || 'Risk assessment failed');
      }
      return assessment.data;
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Trigger manual risk assessment
   * POST /api/risk/assessments/trigger
   * Body: { companyId, categories?, forceRefresh? }
   */
  fastify.post('/risk/assessments/trigger', handleRoute(async (request, _reply) => {
    const body = request.body as any;
    
    const companyId = await resolveCompanyId(body.companyId);
    
    // const categories = body.categories ? body.categories : undefined;
    // const forceRefresh = body.forceRefresh === true;
    
    try {
      const riskEngine = getRiskEngine();
      const result = await riskEngine.assessRisk(companyId);
      
      if (!result.success || !result.data) {
        throw new Error('Failed to trigger risk assessment');
      }
      
      return {
        success: true,
        message: 'Risk assessment triggered successfully',
        assessmentId: result.data.companyId,
        estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        data: result.data
      };
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get risk alerts
   * GET /api/risk/alerts
   * Query params: companyId, severity, active, category
   */
  fastify.get('/risk/alerts', handleRoute(async (request, _reply) => {
    const query = request.query as any;
    
    const companyId = await resolveCompanyId(query.companyId);
    
    // TODO: Use these parameters for alert filtering
    // const severity = query.severity;
    // const activeOnly = query.active !== 'false';
    // const category = query.category;
    
    try {
      // Get current risk assessment to generate alerts
      const riskEngine = getRiskEngine();
      const assessment = await riskEngine.assessRisk(companyId);
      
      if (!assessment.success || !assessment.data) {
        // Return empty array if assessment fails
        return [];
      }
      
      // Return the alerts array from the assessment
      return assessment.data.alerts || [];
    } catch (error) {
      console.error('Risk alerts API Error:', error);
      // Return empty array on error to prevent frontend crashes
      return [];
    }
  }));
  
  /**
   * Acknowledge/resolve risk alert
   * POST /api/risk/alerts/:alertId/acknowledge
   * Path params: alertId
   * Body: { acknowledgedBy, notes? }
   */
  fastify.post('/risk/alerts/:alertId/acknowledge', handleRoute(async (request, _reply) => {
    const params = request.params as any;
    const body = request.body as any;
    
    const alertId = validateString(params.alertId, 'alertId');
    validateRequired(body.acknowledgedBy, 'acknowledgedBy');
    const acknowledgedBy = validateString(body.acknowledgedBy, 'acknowledgedBy');
    
    const notes = body.notes ? validateString(body.notes, 'notes') : undefined;
    
    try {
      // TODO: Implement alert acknowledgment with risk engine
      return {
        success: true,
        message: 'Alert acknowledged successfully (not yet implemented)',
        alertId,
        acknowledgedBy,
        notes
      };
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get risk thresholds configuration
   * GET /api/risk/thresholds
   * Query params: companyId
   */
  fastify.get('/risk/thresholds', handleRoute(async (request, _reply) => {
    const query = request.query as any;
    
    const companyId = await resolveCompanyId(query.companyId);
    
    try {
      // TODO: Implement threshold fetching with risk engine
      return {
        success: true,
        thresholds: {
          safetyMarginPercent: 20,
          criticalThresholdDays: 3,
          warningThresholdDays: 7
        }
      };
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Update risk thresholds configuration
   * PUT /api/risk/thresholds
   * Body: { companyId, thresholds }
   */
  fastify.put('/risk/thresholds', handleRoute(async (request, _reply) => {
    const body = request.body as any;
    
    validateRequired(body.companyId, 'companyId');
    const companyId = validateString(body.companyId, 'companyId');
    
    validateRequired(body.thresholds, 'thresholds');
    const thresholds = body.thresholds;
    
    try {
      // TODO: Implement threshold updating with risk engine
      return {
        success: true,
        message: 'Risk thresholds updated successfully (not yet implemented)',
        companyId,
        thresholds
      };
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get risk trends and analytics
   * GET /api/risk/trends
   * Query params: companyId, period, daysBack
   */
  fastify.get('/risk/trends', handleRoute(async (request, _reply) => {
    const query = request.query as any;
    
    validateRequired(query.companyId, 'companyId');
    validateString(query.companyId, 'companyId');
    
    const period = validateEnum(
      query.period || 'daily',
      'period',
      ['daily', 'weekly', 'monthly']
    );
    
    const daysBack = query.daysBack ? validateNumber(query.daysBack, 'daysBack') : 30;
    
    try {
      // TODO: Implement trend analysis with risk engine
      return {
        success: true,
        trends: {
          period,
          daysBack,
          data: []
        }
      };
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get risk score breakdown
   * GET /api/risk/score
   * Query params: companyId, detailed
   */
  fastify.get('/risk/score', handleRoute(async (request, _reply) => {
    const query = request.query as any;
    
    validateRequired(query.companyId, 'companyId');
    const companyId = validateString(query.companyId, 'companyId');
    
    const detailed = query.detailed === 'true';
    
    try {
      // Use risk engine for score calculation
      const riskEngine = getRiskEngine();
      const assessment = await riskEngine.assessRisk(companyId);
      if (!assessment.success) {
        throw new Error(assessment.error?.message || 'Risk assessment failed');
      }
      
      return {
        success: true,
        score: assessment.data.riskLevel.score,
        level: assessment.data.riskLevel.level,
        detailed: detailed ? assessment.data : undefined
      };
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Export risk assessment report
   * GET /api/risk/reports/export
   * Query params: companyId, format, startDate, endDate
   */
  fastify.get('/risk/reports/export', handleRoute(async (request, reply) => {
    const query = request.query as any;
    
    validateRequired(query.companyId, 'companyId');
    const companyId = validateString(query.companyId, 'companyId');
    
    const format = validateEnum(
      query.format || 'json',
      'format',
      ['json', 'csv', 'pdf']
    );
    
    const startDate = query.startDate ? validateDate(query.startDate, 'startDate') : undefined;
    const endDate = query.endDate ? validateDate(query.endDate, 'endDate') : undefined;
    
    try {
      // Use risk engine for report generation
      const riskEngine = getRiskEngine();
      const assessment = await riskEngine.assessRisk(companyId);
      if (!assessment.success) {
        throw new Error(assessment.error?.message || 'Risk assessment failed');
      }
      
      if (format === 'json') {
        return {
          success: true,
          report: assessment.data,
          companyId,
          format,
          startDate,
          endDate
        };
      }
      
      // For CSV/PDF, set appropriate headers and return the file
      reply.header('Content-Type', format === 'csv' ? 'text/csv' : 'application/pdf');
      reply.header('Content-Disposition', `attachment; filename="risk-report.${format}"`);
      
      return `Risk report for ${companyId} (${format} format not yet implemented)`;
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Simulate risk scenarios
   * POST /api/risk/simulate
   * Body: { companyId, scenarios }
   */
  fastify.post('/risk/simulate', handleRoute(async (request, _reply) => {
    const body = request.body as any;
    
    validateRequired(body.companyId, 'companyId');
    const companyId = validateString(body.companyId, 'companyId');
    
    validateRequired(body.scenarios, 'scenarios');
    const scenarios = body.scenarios;
    
    try {
      // TODO: Implement scenario simulation with risk engine
      return {
        success: true,
        message: 'Risk scenarios simulated successfully (not yet implemented)',
        companyId,
        scenarios,
        results: []
      };
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
}

export default riskAssessmentRoutes;
// @ts-nocheck
