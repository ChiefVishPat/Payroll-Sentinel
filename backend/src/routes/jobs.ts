import { FastifyInstance } from 'fastify';
import { 
  handleRoute, 
  validateRequired, 
  validateString,
  validateNumber,
  validateBoolean,
  parsePagination,
  formatPaginatedResponse,
  mapServiceError 
} from './helpers.js';

/**
 * Job Management Routes
 * 
 * Routes for managing scheduled jobs, monitoring job execution, and controlling
 * automated tasks like risk assessments and data synchronization.
 */

async function jobRoutes(fastify: FastifyInstance) {
  // Services will be available after decoration, but we'll check in each route
  const getJobScheduler = () => {
    const services = (fastify as any).services;
    if (!services || !services.jobScheduler) {
      throw new Error('Job scheduler service not available');
    }
    return services.jobScheduler;
  };
  
  /**
   * Get all scheduled jobs
   * GET /api/jobs
   * Query params: page, limit
   */
  fastify.get('/jobs', handleRoute(async (request, _reply) => {
    const query = request.query as any;
    const pagination = parsePagination(query);
    
    try {
      const result = await getJobScheduler().getAllJobs();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch jobs');
      }
      
      return formatPaginatedResponse(result.data, result.data.length, pagination);
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get specific job status
   * GET /api/jobs/:jobId
   * Path params: jobId
   */
  fastify.get('/jobs/:jobId', handleRoute(async (request, _reply) => {
    const params = request.params as any;
    
    const jobId = validateString(params.jobId, 'jobId');
    
    try {
      const result = await getJobScheduler().getJobStatus(jobId);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch job status');
      }
      
      if (!result.data) {
        throw new Error('Job not found');
      }
      
      return result.data;
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get job execution results
   * GET /api/jobs/:jobId/results
   * Path params: jobId
   * Query params: limit
   */
  fastify.get('/jobs/:jobId/results', handleRoute(async (request, _reply) => {
    const params = request.params as any;
    const query = request.query as any;
    
    const jobId = validateString(params.jobId, 'jobId');
    const limit = query.limit ? validateNumber(query.limit, 'limit') : 10;
    
    try {
      const result = await getJobScheduler().getJobResults(jobId, limit);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch job results');
      }
      
      return result.data;
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Trigger job execution manually
   * POST /api/jobs/:jobId/trigger
   * Path params: jobId
   */
  fastify.post('/jobs/:jobId/trigger', handleRoute(async (request, _reply) => {
    const params = request.params as any;
    
    const jobId = validateString(params.jobId, 'jobId');
    
    try {
      const result = await getJobScheduler().triggerJob(jobId);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to trigger job');
      }
      
      return {
        success: true,
        message: 'Job triggered successfully',
        result: result.data
      };
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Update job configuration
   * PUT /api/jobs/:jobId
   * Path params: jobId
   * Body: { name?, interval?, enabled?, companyId? }
   */
  fastify.put('/jobs/:jobId', handleRoute(async (request, _reply) => {
    const params = request.params as any;
    const body = request.body as any;
    
    const jobId = validateString(params.jobId, 'jobId');
    
    const updates: any = {};
    
    if (body.name !== undefined) {
      updates.name = validateString(body.name, 'name');
    }
    
    if (body.interval !== undefined) {
      updates.interval = validateNumber(body.interval, 'interval');
    }
    
    if (body.enabled !== undefined) {
      updates.enabled = validateBoolean(body.enabled, 'enabled');
    }
    
    if (body.companyId !== undefined) {
      updates.companyId = validateString(body.companyId, 'companyId');
    }
    
    try {
      const result = await getJobScheduler().updateJob(jobId, updates);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to update job');
      }
      
      return {
        success: true,
        message: 'Job updated successfully'
      };
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Delete a job
   * DELETE /api/jobs/:jobId
   * Path params: jobId
   */
  fastify.delete('/jobs/:jobId', handleRoute(async (request, _reply) => {
    const params = request.params as any;
    
    const jobId = validateString(params.jobId, 'jobId');
    
    try {
      const result = await getJobScheduler().deleteJob(jobId);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to delete job');
      }
      
      return {
        success: true,
        message: 'Job deleted successfully'
      };
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get scheduler statistics
   * GET /api/jobs/stats
   */
  fastify.get('/jobs/stats', handleRoute(async (_request, _reply) => {
    try {
      const result = await getJobScheduler().getSchedulerStats();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch scheduler stats');
      }
      
      return result.data;
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Start all jobs
   * POST /api/jobs/start-all
   */
  fastify.post('/jobs/start-all', handleRoute(async (_request, _reply) => {
    try {
      const result = await getJobScheduler().startAllJobs();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to start all jobs');
      }
      
      return {
        success: true,
        message: 'All jobs started successfully'
      };
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Stop all jobs
   * POST /api/jobs/stop-all
   */
  fastify.post('/jobs/stop-all', handleRoute(async (_request, _reply) => {
    try {
      const result = await getJobScheduler().stopAllJobs();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to stop all jobs');
      }
      
      return {
        success: true,
        message: 'All jobs stopped successfully'
      };
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Create a new scheduled job
   * POST /api/jobs
   * Body: { name, type, interval, enabled, companyId?, metadata? }
   */
  fastify.post('/jobs', handleRoute(async (request, _reply) => {
    const body = request.body as any;
    
    validateRequired(body.name, 'name');
    validateRequired(body.type, 'type');
    validateRequired(body.interval, 'interval');
    
    const name = validateString(body.name, 'name');
    const type = validateString(body.type, 'type');
    const interval = validateNumber(body.interval, 'interval');
    const enabled = body.enabled !== undefined ? validateBoolean(body.enabled, 'enabled') : true;
    const companyId = body.companyId ? validateString(body.companyId, 'companyId') : undefined;
    const metadata = body.metadata || {};
    
    const jobId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job = {
      id: jobId,
      name,
      type: type as 'risk_assessment' | 'data_refresh' | 'alert_check' | 'cleanup',
      interval,
      nextRun: new Date(Date.now() + interval * 60 * 1000),
      isRunning: false,
      enabled,
      companyId,
      metadata
    };
    
    try {
      const result = await getJobScheduler().scheduleJob(job);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create job');
      }
      
      return {
        success: true,
        message: 'Job created successfully',
        jobId: jobId,
        job: job
      };
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
}

export default jobRoutes;
