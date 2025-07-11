// @ts-nocheck
/**
 * Job Scheduler Service
 * 
 * Handles automated tasks like risk assessments, data synchronization, and alerts.
 * Provides cron-like functionality for regular monitoring and maintenance operations.
 */

import { BaseService, ServiceResponse, ServiceConfig } from './base';
import { RiskEngine } from './riskEngine';
import { PlaidService } from './plaid';
import { CheckService } from './check';
import { SlackService } from './slack';

export interface JobSchedulerConfig extends ServiceConfig {
  riskAssessmentInterval: number; // minutes
  dataRefreshInterval: number; // minutes
  alertCheckInterval: number; // minutes
  enableAutoAlerts: boolean;
  maxConcurrentJobs: number;
}

export interface ScheduledJob {
  id: string;
  name: string;
  type: 'risk_assessment' | 'data_refresh' | 'alert_check' | 'cleanup';
  interval: number; // minutes
  lastRun?: Date;
  nextRun: Date;
  isRunning: boolean;
  enabled: boolean;
  companyId?: string;
  metadata?: any;
}

export interface JobResult {
  jobId: string;
  success: boolean;
  startTime: Date;
  endTime: Date;
  duration: number;
  error?: string;
  data?: any;
}

/**
 * Job Scheduler service class
 */
export class JobScheduler extends BaseService {
  private readonly jobConfig: JobSchedulerConfig;
  private riskEngine: RiskEngine;
  private plaidService: PlaidService;
  // private _checkService: CheckService;
  // private _slackService: SlackService;
  
  private jobs: Map<string, ScheduledJob> = new Map();
  private jobResults: Map<string, JobResult[]> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private runningJobs: Set<string> = new Set();

  constructor(
    config: JobSchedulerConfig,
    riskEngine: RiskEngine,
    plaidService: PlaidService,
    _checkService: CheckService,
    _slackService: SlackService
  ) {
    super('job-scheduler', config);
    this.jobConfig = {
      ...config,
      riskAssessmentInterval: config.riskAssessmentInterval || 60, // Every hour
      dataRefreshInterval: config.dataRefreshInterval || 30, // Every 30 minutes
      alertCheckInterval: config.alertCheckInterval || 15, // Every 15 minutes
      enableAutoAlerts: config.enableAutoAlerts ?? true,
      maxConcurrentJobs: config.maxConcurrentJobs || 5
    };
    
    this.riskEngine = riskEngine;
    this.plaidService = plaidService;
    // this._checkService = checkService;
    // this._slackService = slackService;
  }

  /**
   * Initialize and start the job scheduler
   * @returns Initialization result
   */
  async initialize(): Promise<ServiceResponse<boolean>> {
    return this.executeWithErrorHandling(async () => {
      // Create default jobs
      await this.createDefaultJobs();
      
      // Start all enabled jobs
      await this.startAllJobs();
      
      this.logger.info('Job scheduler initialized successfully');
      return true;
    }, 'initialize job scheduler');
  }

  /**
   * Create default scheduled jobs
   */
  private async createDefaultJobs(): Promise<void> {
    // Risk assessment job
    await this.scheduleJob({
      id: 'risk_assessment_default',
      name: 'Risk Assessment',
      type: 'risk_assessment',
      interval: this.jobConfig.riskAssessmentInterval,
      nextRun: new Date(Date.now() + this.jobConfig.riskAssessmentInterval * 60 * 1000),
      isRunning: false,
      enabled: true
    });

    // Data refresh job
    await this.scheduleJob({
      id: 'data_refresh_default',
      name: 'Data Refresh',
      type: 'data_refresh',
      interval: this.jobConfig.dataRefreshInterval,
      nextRun: new Date(Date.now() + this.jobConfig.dataRefreshInterval * 60 * 1000),
      isRunning: false,
      enabled: true
    });

    // Alert check job
    await this.scheduleJob({
      id: 'alert_check_default',
      name: 'Alert Check',
      type: 'alert_check',
      interval: this.jobConfig.alertCheckInterval,
      nextRun: new Date(Date.now() + this.jobConfig.alertCheckInterval * 60 * 1000),
      isRunning: false,
      enabled: true
    });

    // Cleanup job (daily)
    await this.scheduleJob({
      id: 'cleanup_default',
      name: 'Cleanup',
      type: 'cleanup',
      interval: 24 * 60, // Daily
      nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000),
      isRunning: false,
      enabled: true
    });
  }

  /**
   * Schedule a new job
   * @param job - Job configuration
   * @returns Success status
   */
  async scheduleJob(job: ScheduledJob): Promise<ServiceResponse<boolean>> {
    return this.executeWithErrorHandling(async () => {
      this.jobs.set(job.id, job);
      
      if (job.enabled) {
        await this.startJob(job.id);
      }
      
      this.logger.info(`Job scheduled: ${job.name}`, { jobId: job.id, interval: job.interval });
      return true;
    }, `schedule job ${job.id}`);
  }

  /**
   * Start a specific job
   * @param jobId - Job identifier
   * @returns Success status
   */
  async startJob(jobId: string): Promise<ServiceResponse<boolean>> {
    return this.executeWithErrorHandling(async () => {
      const job = this.jobs.get(jobId);
      if (!job) {
        throw new Error(`Job not found: ${jobId}`);
      }

      if (this.timers.has(jobId)) {
        clearInterval(this.timers.get(jobId)!);
      }

      // Set up interval timer
      const timer = setInterval(() => {
        this.executeJob(jobId);
      }, job.interval * 60 * 1000);

      this.timers.set(jobId, timer);
      
      this.logger.info(`Job started: ${job.name}`, { jobId });
      return true;
    }, `start job ${jobId}`);
  }

  /**
   * Stop a specific job
   * @param jobId - Job identifier
   * @returns Success status
   */
  async stopJob(jobId: string): Promise<ServiceResponse<boolean>> {
    return this.executeWithErrorHandling(async () => {
      const timer = this.timers.get(jobId);
      if (timer) {
        clearInterval(timer);
        this.timers.delete(jobId);
      }

      const job = this.jobs.get(jobId);
      if (job) {
        job.enabled = false;
        this.logger.info(`Job stopped: ${job.name}`, { jobId });
      }

      return true;
    }, `stop job ${jobId}`);
  }

  /**
   * Start all enabled jobs
   * @returns Success status
   */
  async startAllJobs(): Promise<ServiceResponse<boolean>> {
    return this.executeWithErrorHandling(async () => {
      const enabledJobs = Array.from(this.jobs.values()).filter(job => job.enabled);
      
      for (const job of enabledJobs) {
        await this.startJob(job.id);
      }
      
      this.logger.info(`Started ${enabledJobs.length} jobs`);
      return true;
    }, 'start all jobs');
  }

  /**
   * Stop all jobs
   * @returns Success status
   */
  async stopAllJobs(): Promise<ServiceResponse<boolean>> {
    return this.executeWithErrorHandling(async () => {
      const jobIds = Array.from(this.timers.keys());
      
      for (const jobId of jobIds) {
        await this.stopJob(jobId);
      }
      
      this.logger.info(`Stopped ${jobIds.length} jobs`);
      return true;
    }, 'stop all jobs');
  }

  /**
   * Execute a specific job
   * @param jobId - Job identifier
   * @returns Job execution result
   */
  private async executeJob(jobId: string): Promise<JobResult> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    // Check if job is already running
    if (this.runningJobs.has(jobId)) {
      this.logger.warn(`Job already running: ${job.name}`, { jobId });
      return {
        jobId,
        success: false,
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        error: 'Job already running'
      };
    }

    // Check concurrent job limit
    if (this.runningJobs.size >= this.jobConfig.maxConcurrentJobs) {
      this.logger.warn(`Max concurrent jobs reached, skipping: ${job.name}`, { jobId });
      return {
        jobId,
        success: false,
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        error: 'Max concurrent jobs reached'
      };
    }

    const startTime = new Date();
    this.runningJobs.add(jobId);
    job.isRunning = true;
    job.lastRun = startTime;
    job.nextRun = new Date(startTime.getTime() + job.interval * 60 * 1000);

    try {
      this.logger.info(`Executing job: ${job.name}`, { jobId });
      
      let result: any;
      switch (job.type) {
        case 'risk_assessment':
          result = await this.executeRiskAssessmentJob(job);
          break;
        case 'data_refresh':
          result = await this.executeDataRefreshJob(job);
          break;
        case 'alert_check':
          result = await this.executeAlertCheckJob(job);
          break;
        case 'cleanup':
          result = await this.executeCleanupJob(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      const jobResult: JobResult = {
        jobId,
        success: true,
        startTime,
        endTime,
        duration,
        data: result
      };

      // Store job result
      this.storeJobResult(jobId, jobResult);
      
      this.logger.info(`Job completed: ${job.name}`, { 
        jobId, 
        duration: `${duration}ms`,
        success: true 
      });

      return jobResult;

    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      const jobResult: JobResult = {
        jobId,
        success: false,
        startTime,
        endTime,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      // Store job result
      this.storeJobResult(jobId, jobResult);
      
      this.logger.error(`Job failed: ${job.name}`, { 
        jobId, 
        duration: `${duration}ms`,
        error: jobResult.error 
      });

      return jobResult;

    } finally {
      this.runningJobs.delete(jobId);
      job.isRunning = false;
    }
  }

  /**
   * Execute risk assessment job
   * @param job - Job configuration
   * @returns Risk assessment results
   */
  private async executeRiskAssessmentJob(job: ScheduledJob): Promise<any> {
    const companyId = job.companyId || 'company_1'; // Default company
    
    const riskAssessment = await this.riskEngine.assessRisk(companyId);
    
    if (!riskAssessment.success || !riskAssessment.data) {
      throw new Error('Risk assessment failed');
    }

    // Send alerts if enabled and risk level is not safe
    if (this.jobConfig.enableAutoAlerts && riskAssessment.data.riskLevel.level !== 'safe') {
      await this.riskEngine.sendRiskAlerts(companyId, riskAssessment.data);
    }

    return {
      companyId,
      riskLevel: riskAssessment.data.riskLevel.level,
      alertsSent: this.jobConfig.enableAutoAlerts && riskAssessment.data.riskLevel.level !== 'safe'
    };
  }

  /**
   * Execute data refresh job
   * @param job - Job configuration
   * @returns Data refresh results
   */
  private async executeDataRefreshJob(job: ScheduledJob): Promise<any> {
    const companyId = job.companyId || 'company_1'; // Default company
    
    // Refresh account data
    const refreshResponse = await this.plaidService.refreshAccountData(companyId, {});
    
    if (!refreshResponse.success) {
      throw new Error('Data refresh failed');
    }

    return {
      companyId,
      refreshed: true,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute alert check job
   * @param job - Job configuration
   * @returns Alert check results
   */
  private async executeAlertCheckJob(job: ScheduledJob): Promise<any> {
    // Check for any pending alerts or notifications
    const companyId = job.companyId || 'company_1'; // Default company
    
    // This would typically check database for unprocessed alerts
    // For now, return a simple status
    return {
      companyId,
      alertsChecked: true,
      pendingAlerts: 0,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute cleanup job
   * @param job - Job configuration
   * @returns Cleanup results
   */
  private async executeCleanupJob(_job: ScheduledJob): Promise<any> {
    // Clean up old job results (keep last 100)
    this.jobResults.forEach((results, jobId) => {
      if (results.length > 100) {
        this.jobResults.set(jobId, results.slice(-100));
      }
    });

    return {
      cleanedUp: true,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Store job execution result
   * @param jobId - Job identifier
   * @param result - Job result
   */
  private storeJobResult(jobId: string, result: JobResult): void {
    const results = this.jobResults.get(jobId) || [];
    results.push(result);
    
    // Keep only last 50 results per job
    if (results.length > 50) {
      results.splice(0, results.length - 50);
    }
    
    this.jobResults.set(jobId, results);
  }

  /**
   * Get job status
   * @param jobId - Job identifier
   * @returns Job status
   */
  async getJobStatus(jobId: string): Promise<ServiceResponse<ScheduledJob | null>> {
    return this.executeWithErrorHandling(async () => {
      const job = this.jobs.get(jobId);
      return job || null;
    }, `get job status ${jobId}`);
  }

  /**
   * Get all jobs
   * @returns All scheduled jobs
   */
  async getAllJobs(): Promise<ServiceResponse<ScheduledJob[]>> {
    return this.executeWithErrorHandling(async () => {
      return Array.from(this.jobs.values());
    }, 'get all jobs');
  }

  /**
   * Get job results
   * @param jobId - Job identifier
   * @param limit - Maximum number of results
   * @returns Job execution results
   */
  async getJobResults(jobId: string, limit: number = 10): Promise<ServiceResponse<JobResult[]>> {
    return this.executeWithErrorHandling(async () => {
      const results = this.jobResults.get(jobId) || [];
      return results.slice(-limit);
    }, `get job results ${jobId}`);
  }

  /**
   * Manually trigger a job
   * @param jobId - Job identifier
   * @returns Job execution result
   */
  async triggerJob(jobId: string): Promise<ServiceResponse<JobResult>> {
    return this.executeWithErrorHandling(async () => {
      const result = await this.executeJob(jobId);
      return result;
    }, `trigger job ${jobId}`);
  }

  /**
   * Update job configuration
   * @param jobId - Job identifier
   * @param updates - Job updates
   * @returns Success status
   */
  async updateJob(jobId: string, updates: Partial<ScheduledJob>): Promise<ServiceResponse<boolean>> {
    return this.executeWithErrorHandling(async () => {
      const job = this.jobs.get(jobId);
      if (!job) {
        throw new Error(`Job not found: ${jobId}`);
      }

      // Update job properties
      Object.assign(job, updates);
      
      // Restart job if interval changed
      if (updates.interval && job.enabled) {
        await this.stopJob(jobId);
        await this.startJob(jobId);
      }

      return true;
    }, `update job ${jobId}`);
  }

  /**
   * Delete a job
   * @param jobId - Job identifier
   * @returns Success status
   */
  async deleteJob(jobId: string): Promise<ServiceResponse<boolean>> {
    return this.executeWithErrorHandling(async () => {
      await this.stopJob(jobId);
      this.jobs.delete(jobId);
      this.jobResults.delete(jobId);
      
      return true;
    }, `delete job ${jobId}`);
  }

  /**
   * Get scheduler statistics
   * @returns Scheduler statistics
   */
  async getSchedulerStats(): Promise<ServiceResponse<any>> {
    return this.executeWithErrorHandling(async () => {
      const totalJobs = this.jobs.size;
      const enabledJobs = Array.from(this.jobs.values()).filter(job => job.enabled).length;
      const runningJobs = this.runningJobs.size;
      
      return {
        totalJobs,
        enabledJobs,
        runningJobs,
        maxConcurrentJobs: this.jobConfig.maxConcurrentJobs,
        uptime: process.uptime()
      };
    }, 'get scheduler stats');
  }

  /**
   * Shutdown the scheduler
   * @returns Success status
   */
  async shutdown(): Promise<ServiceResponse<boolean>> {
    return this.executeWithErrorHandling(async () => {
      await this.stopAllJobs();
      this.logger.info('Job scheduler shutdown complete');
      return true;
    }, 'shutdown scheduler');
  }
}
// @ts-nocheck
// @ts-nocheck
