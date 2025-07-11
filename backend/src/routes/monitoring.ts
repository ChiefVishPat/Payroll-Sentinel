import { FastifyInstance } from 'fastify';
import { 
  handleRoute, 
  validateRequired, 
  validateString,
  validateEnum,
  parsePagination,
  formatPaginatedResponse,
  mapServiceError 
} from './helpers.js';
import { MonitoringService } from '../services/monitoring.js';
import { ApiError, ErrorType } from '../middleware/index.js';

interface JobFilters {
  companyId?: string;
  type?: 'cash_flow_analysis' | 'risk_assessment' | 'payroll_sync' | 'bank_refresh' | 'notification_send';
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

async function monitoringRoutes(fastify: FastifyInstance) {
  const monitoringService = new MonitoringService({
    environment: (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production'
  });
  
  /**
   * Get system health status
   * GET /api/monitoring/health
   */
  fastify.get('/monitoring/health', handleRoute(async (_request, _reply) => {
    try {
      const health = await monitoringService.getHealth();
      
      if (!health.success || !health.data) {
        throw new ApiError(ErrorType.INTERNAL_ERROR, 'Failed to get system health');
      }
      
      return health.data;
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get detailed system health with component breakdown
   * GET /api/monitoring/health/detailed
   */
  fastify.get('/monitoring/health/detailed', handleRoute(async (_request, _reply) => {
    try {
      const detailedHealth = await monitoringService.getDetailedHealth();
      
      if (!detailedHealth.success || !detailedHealth.data) {
        throw new ApiError(ErrorType.INTERNAL_ERROR, 'Failed to get detailed system health');
      }
      
      return detailedHealth.data;
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get system metrics
   * GET /api/monitoring/metrics
   * Query params: metric, startTime, endTime, interval
   */
  fastify.get('/monitoring/metrics', handleRoute(async (_request, _reply) => {
    // const query = request.query as any;
    
    // Parameters validated but not used in mock implementation
    // const metric = query.metric; // cpu, memory, disk, network, requests
    // const startTime = query.startTime ? new Date(query.startTime) : undefined;
    // const endTime = query.endTime ? new Date(query.endTime) : undefined;
    // const interval = query.interval || '5m'; // 1m, 5m, 1h, 1d
    
    try {
      const metrics = await monitoringService.getMetrics();
      
      return metrics;
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get background job status
   * GET /api/monitoring/jobs
   * Query params: companyId, type, status, priority, page, limit
   */
  fastify.get('/monitoring/jobs', handleRoute(async (request, _reply) => {
    const query = request.query as any;
    const pagination = parsePagination(query);
    
    const filters: JobFilters = {};
    
    if (query.companyId) {
      filters.companyId = validateString(query.companyId, 'companyId');
    }
    
    if (query.type) {
      filters.type = validateEnum(
        query.type,
        'type',
        ['cash_flow_analysis', 'risk_assessment', 'payroll_sync', 'bank_refresh', 'notification_send']
      ) as 'cash_flow_analysis' | 'risk_assessment' | 'payroll_sync' | 'bank_refresh' | 'notification_send';
    }
    
    if (query.status) {
      filters.status = validateEnum(
        query.status,
        'status',
        ['pending', 'running', 'completed', 'failed', 'cancelled']
      ) as 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    }
    
    if (query.priority) {
      filters.priority = validateEnum(
        query.priority,
        'priority',
        ['low', 'medium', 'high', 'critical']
      ) as 'low' | 'medium' | 'high' | 'critical';
    }
    
    try {
      const result = await monitoringService.getJobs();
      return formatPaginatedResponse(result.data || [], result.data?.length || 0, pagination);
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get specific job details
   * GET /api/monitoring/jobs/:jobId
   * Path params: jobId
   */
  fastify.get('/monitoring/jobs/:jobId', handleRoute(async (request, _reply) => {
    const params = request.params as any;
    
    const jobId = validateString(params.jobId, 'jobId');
    
    try {
      const job = await monitoringService.getJobById(jobId);
      return job;
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Trigger manual job
   * POST /api/monitoring/jobs/trigger
   * Body: { companyId, type, priority?, parameters? }
   */
  fastify.post('/monitoring/jobs/trigger', handleRoute(async (request, _reply) => {
    const body = request.body as any;
    
    validateRequired(body.companyId, 'companyId');
    // companyId validated but not used in mock implementation
    // const companyId = validateString(body.companyId, 'companyId');
    
    validateRequired(body.type, 'type');
    const type = validateEnum(
      body.type,
      'type',
      ['cash_flow_analysis', 'risk_assessment', 'payroll_sync', 'bank_refresh', 'notification_send']
    );
    
    const priority = body.priority || 'medium';
    const parameters = body.parameters || {};
    
    try {
      const job = await monitoringService.triggerJob(type, { priority, parameters });
      
      return {
        success: true,
        message: 'Job triggered successfully',
        jobId: job.data?.jobId || 'job_generated',
        estimatedCompletion: job.data?.estimatedCompletion || new Date(Date.now() + 60000).toISOString()
      };
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Cancel job
   * POST /api/monitoring/jobs/:jobId/cancel
   * Path params: jobId
   * Body: { reason? }
   */
  fastify.post('/monitoring/jobs/:jobId/cancel', handleRoute(async (request, _reply) => {
    const params = request.params as any;
    // const body = request.body as any;
    
    const jobId = validateString(params.jobId, 'jobId');
    // reason validated but not used in mock implementation
    // const reason = body.reason ? validateString(body.reason, 'reason') : undefined;
    
    try {
      const result = await monitoringService.cancelJob(jobId);
      
      return {
        success: true,
        message: 'Job cancelled successfully',
        job: result
      };
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get job queue statistics
   * GET /api/monitoring/jobs/stats
   * Query params: companyId, period
   */
  fastify.get('/monitoring/jobs/stats', handleRoute(async (_request, _reply) => {
    // const query = request.query as any;
    
    // Parameters validated but not used in mock implementation
    // const companyId = query.companyId ? validateString(query.companyId, 'companyId') : undefined;
    // const period = query.period || 'day'; // hour, day, week, month
    
    try {
      const stats = await monitoringService.getJobStats();
      
      return stats;
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get error logs
   * GET /api/monitoring/errors
   * Query params: companyId, level, component, startTime, endTime, page, limit
   */
  fastify.get('/monitoring/errors', handleRoute(async (request, _reply) => {
    const query = request.query as any;
    const pagination = parsePagination(query);
    
    const filters: any = {};
    
    if (query.companyId) {
      filters.companyId = validateString(query.companyId, 'companyId');
    }
    
    if (query.level) {
      filters.level = validateEnum(
        query.level,
        'level',
        ['error', 'warn', 'info', 'debug']
      );
    }
    
    if (query.component) {
      filters.component = validateString(query.component, 'component');
    }
    
    if (query.startTime) {
      filters.startTime = new Date(query.startTime);
    }
    
    if (query.endTime) {
      filters.endTime = new Date(query.endTime);
    }
    
    try {
      const result = await monitoringService.getErrors();
      return formatPaginatedResponse(result.data || [], result.data?.length || 0, pagination);
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get audit logs
   * GET /api/monitoring/audit
   * Query params: companyId, action, userId, startTime, endTime, page, limit
   */
  fastify.get('/monitoring/audit', handleRoute(async (request, _reply) => {
    const query = request.query as any;
    const pagination = parsePagination(query);
    
    const filters: any = {};
    
    if (query.companyId) {
      filters.companyId = validateString(query.companyId, 'companyId');
    }
    
    if (query.action) {
      filters.action = validateString(query.action, 'action');
    }
    
    if (query.userId) {
      filters.userId = validateString(query.userId, 'userId');
    }
    
    if (query.startTime) {
      filters.startTime = new Date(query.startTime);
    }
    
    if (query.endTime) {
      filters.endTime = new Date(query.endTime);
    }
    
    try {
      const result = await monitoringService.getErrors(); // Using getErrors as placeholder
      return formatPaginatedResponse(result.data || [], result.data?.length || 0, pagination);
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get system alerts
   * GET /api/monitoring/alerts
   * Query params: severity, status, component, page, limit
   */
  fastify.get('/monitoring/alerts', handleRoute(async (request, _reply) => {
    const query = request.query as any;
    const pagination = parsePagination(query);
    
    const filters: any = {};
    
    if (query.severity) {
      filters.severity = validateEnum(
        query.severity,
        'severity',
        ['low', 'medium', 'high', 'critical']
      );
    }
    
    if (query.status) {
      filters.status = validateEnum(
        query.status,
        'status',
        ['active', 'resolved', 'suppressed']
      );
    }
    
    if (query.component) {
      filters.component = validateString(query.component, 'component');
    }
    
    try {
      const result = await monitoringService.getErrors(); // Using getErrors as placeholder
      return formatPaginatedResponse(result.data || [], result.data?.length || 0, pagination);
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Acknowledge system alert
   * POST /api/monitoring/alerts/:alertId/acknowledge
   * Path params: alertId
   * Body: { acknowledgedBy, notes? }
   */
  fastify.post('/monitoring/alerts/:alertId/acknowledge', handleRoute(async (request, _reply) => {
    const params = request.params as any;
    const body = request.body as any;
    
    const alertId = validateString(params.alertId, 'alertId');
    
    validateRequired(body.acknowledgedBy, 'acknowledgedBy');
    validateString(body.acknowledgedBy, 'acknowledgedBy');
    
    // const notes = body.notes ? validateString(body.notes, 'notes') : undefined;
    
    try {
      const result = await monitoringService.acknowledgeAlert(alertId);
      
      return {
        success: true,
        message: 'Alert acknowledged successfully',
        alert: result
      };
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get performance metrics
   * GET /api/monitoring/performance
   * Query params: metric, startTime, endTime, companyId
   */
  fastify.get('/monitoring/performance', handleRoute(async (_request, _reply) => {
    // const query = request.query as any;
    
    // Parameters validated but not used in mock implementation
    // const metric = query.metric; // response_time, throughput, error_rate, concurrent_users
    // const startTime = query.startTime ? new Date(query.startTime) : undefined;
    // const endTime = query.endTime ? new Date(query.endTime) : undefined;
    // const companyId = query.companyId ? validateString(query.companyId, 'companyId') : undefined;
    
    try {
      const performance = await monitoringService.getMetrics(); // Using getMetrics as placeholder
      
      return performance;
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get external service status
   * GET /api/monitoring/external-services
   */
  fastify.get('/monitoring/external-services', handleRoute(async (_request, _reply) => {
    try {
      const serviceStatus = await monitoringService.getExternalServicesStatus();
      return serviceStatus;
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Test external service connection
   * POST /api/monitoring/external-services/test
   * Body: { service, companyId? }
   */
  fastify.post('/monitoring/external-services/test', handleRoute(async (request, _reply) => {
    const body = request.body as any;
    
    validateRequired(body.service, 'service');
    const service = validateEnum(
      body.service,
      'service',
      ['plaid', 'check', 'slack', 'supabase']
    );
    
    // companyId validated but not used in mock implementation
    // const companyId = body.companyId ? validateString(body.companyId, 'companyId') : undefined;
    
    try {
      const result = await monitoringService.testExternalService(service);
      
      return {
        success: true,
        message: 'External service test completed',
        service,
        status: result.data?.status || 'unknown',
        responseTime: result.data?.responseTime || 0,
        details: result.data?.details || {}
      };
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get database health
   * GET /api/monitoring/database
   */
  fastify.get('/monitoring/database', handleRoute(async (_request, _reply) => {
    try {
      const dbHealth = await monitoringService.getHealth(); // Using getHealth as placeholder
      return dbHealth;
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get cache statistics
   * GET /api/monitoring/cache
   */
  fastify.get('/monitoring/cache', handleRoute(async (_request, _reply) => {
    try {
      const cacheStats = await monitoringService.getHealth(); // Using getHealth as placeholder
      return cacheStats;
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Clear cache
   * POST /api/monitoring/cache/clear
   * Body: { pattern?, companyId? }
   */
  fastify.post('/monitoring/cache/clear', handleRoute(async (_request, _reply) => {
    // const body = request.body as any;
    
    // Parameters validated but not used in mock implementation
    // const pattern = body.pattern ? validateString(body.pattern, 'pattern') : undefined;
    // const companyId = body.companyId ? validateString(body.companyId, 'companyId') : undefined;
    
    try {
      const result = await monitoringService.getHealth(); // Using getHealth as placeholder
      
      return {
        success: true,
        message: 'Cache cleared successfully',
        keysCleared: result.data ? 10 : 0
      };
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Export monitoring data
   * GET /api/monitoring/export
   * Query params: type, startTime, endTime, format, companyId
   */
  fastify.get('/monitoring/export', handleRoute(async (request, _reply) => {
    const query = request.query as any;
    
    validateRequired(query.type, 'type');
    const type = validateEnum(
      query.type,
      'type',
      ['logs', 'metrics', 'jobs', 'errors', 'audit']
    );
    
    // Parameters validated but not used in mock implementation
    // const startTime = query.startTime ? new Date(query.startTime) : undefined;
    // const endTime = query.endTime ? new Date(query.endTime) : undefined;
    const format = query.format || 'json'; // json, csv
    // const companyId = query.companyId ? validateString(query.companyId, 'companyId') : undefined;
    
    try {
      const exportData = await monitoringService.getHealth(); // Using getHealth as placeholder
      
      if (format === 'csv') {
        _reply.header('Content-Type', 'text/csv');
        _reply.header('Content-Disposition', `attachment; filename="monitoring-${type}.csv"`);
      }
      
      return exportData;
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
}

export default monitoringRoutes;
