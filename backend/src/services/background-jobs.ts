/**
 * Background Jobs Service
 * 
 * Handles automated monitoring, scheduled risk assessments,
 * and other background tasks using node-cron.
 */

import * as cron from 'node-cron';
import { BaseService, ServiceResponse, ServiceConfig } from './base';
import { RiskDetectionService } from './risk-detection';

export interface BackgroundJobsConfig extends ServiceConfig {
  // Job scheduling configuration
  schedules?: {
    riskMonitoring?: string; // Cron expression for risk monitoring
    dailyReports?: string; // Cron expression for daily reports
    healthChecks?: string; // Cron expression for health checks
  };
  
  // Monitoring configuration
  enabledJobs?: {
    riskMonitoring?: boolean;
    dailyReports?: boolean;
    healthChecks?: boolean;
  };
  
  // Company management
  monitoredCompanies?: string[];
  autoDiscoverCompanies?: boolean;
}

export interface JobStatus {
  jobName: string;
  enabled: boolean;
  schedule: string;
  lastRun?: string;
  nextRun?: string;
  status: 'running' | 'idle' | 'error' | 'disabled';
  lastResult?: any;
  errorMessage?: string;
}

export interface JobExecutionResult {
  jobName: string;
  executedAt: string;
  duration: number;
  success: boolean;
  companiesProcessed: number;
  alertsTriggered: number;
  errors?: string[];
}

/**
 * Background Jobs Service
 * Manages automated tasks and scheduled operations
 */
export class BackgroundJobsService extends BaseService {
  protected override readonly config: BackgroundJobsConfig;
  private readonly riskDetectionService: RiskDetectionService;
  
  // Job management
  private jobs = new Map<string, cron.ScheduledTask>();
  private jobStatuses = new Map<string, JobStatus>();
  private jobHistory: JobExecutionResult[] = [];

  constructor(
    config: BackgroundJobsConfig,
    riskDetectionService: RiskDetectionService
  ) {
    super('background-jobs', config);
    this.config = {
      schedules: {
        riskMonitoring: '0 */1 * * *', // Every hour
        dailyReports: '0 9 * * *', // Daily at 9 AM
        healthChecks: '*/15 * * * *', // Every 15 minutes
      },
      enabledJobs: {
        riskMonitoring: true,
        dailyReports: true,
        healthChecks: true,
      },
      monitoredCompanies: [],
      autoDiscoverCompanies: false,
      ...config,
    };
    this.riskDetectionService = riskDetectionService;
  }

  /**
   * Start all enabled background jobs
   * @returns Service response with started jobs
   */
  async startJobs(): Promise<ServiceResponse<{
    startedJobs: string[];
    skippedJobs: string[];
  }>> {
    return this.executeWithErrorHandling(async () => {
      const startedJobs: string[] = [];
      const skippedJobs: string[] = [];

      // Start risk monitoring job
      if (this.config.enabledJobs?.riskMonitoring && this.config.schedules?.riskMonitoring) {
        try {
          await this.startRiskMonitoringJob();
          startedJobs.push('riskMonitoring');
        } catch (error) {
          skippedJobs.push('riskMonitoring');
          this.logger.error('Failed to start risk monitoring job:', error);
        }
      } else {
        skippedJobs.push('riskMonitoring');
      }

      // Start daily reports job
      if (this.config.enabledJobs?.dailyReports && this.config.schedules?.dailyReports) {
        try {
          await this.startDailyReportsJob();
          startedJobs.push('dailyReports');
        } catch (error) {
          skippedJobs.push('dailyReports');
          this.logger.error('Failed to start daily reports job:', error);
        }
      } else {
        skippedJobs.push('dailyReports');
      }

      // Start health checks job
      if (this.config.enabledJobs?.healthChecks && this.config.schedules?.healthChecks) {
        try {
          await this.startHealthChecksJob();
          startedJobs.push('healthChecks');
        } catch (error) {
          skippedJobs.push('healthChecks');
          this.logger.error('Failed to start health checks job:', error);
        }
      } else {
        skippedJobs.push('healthChecks');
      }

      this.logger.log(`[${this.serviceName}] Started ${startedJobs.length} jobs, skipped ${skippedJobs.length}`);

      return { startedJobs, skippedJobs };
    }, 'start background jobs');
  }

  /**
   * Stop all running background jobs
   * @returns Service response with stopped jobs
   */
  async stopJobs(): Promise<ServiceResponse<{
    stoppedJobs: string[];
  }>> {
    return this.executeWithErrorHandling(async () => {
      const stoppedJobs: string[] = [];

      for (const [jobName, task] of this.jobs.entries()) {
        try {
          task.stop();
          // Note: ScheduledTask doesn't have destroy method in current node-cron version
          stoppedJobs.push(jobName);
          
          // Update job status
          const status = this.jobStatuses.get(jobName);
          if (status) {
            status.status = 'disabled';
            this.jobStatuses.set(jobName, status);
          }
        } catch (error) {
          this.logger.error(`Failed to stop job ${jobName}:`, error);
        }
      }

      this.jobs.clear();
      this.logger.log(`[${this.serviceName}] Stopped ${stoppedJobs.length} jobs`);

      return { stoppedJobs };
    }, 'stop background jobs');
  }

  /**
   * Start the risk monitoring job
   */
  private async startRiskMonitoringJob(): Promise<void> {
    const jobName = 'riskMonitoring';
    const schedule = this.config.schedules!.riskMonitoring!;

    const task = cron.schedule(schedule, async () => {
      await this.executeRiskMonitoringJob();
    }, {
      scheduled: false,
      timezone: 'America/New_York', // Adjust as needed
    });

    this.jobs.set(jobName, task);
    this.updateJobStatus(jobName, {
      jobName,
      enabled: true,
      schedule,
      status: 'idle',
    });

    task.start();
    this.logger.log(`[${this.serviceName}] Started risk monitoring job with schedule: ${schedule}`);
  }

  /**
   * Start the daily reports job
   */
  private async startDailyReportsJob(): Promise<void> {
    const jobName = 'dailyReports';
    const schedule = this.config.schedules!.dailyReports!;

    const task = cron.schedule(schedule, async () => {
      await this.executeDailyReportsJob();
    }, {
      scheduled: false,
      timezone: 'America/New_York',
    });

    this.jobs.set(jobName, task);
    this.updateJobStatus(jobName, {
      jobName,
      enabled: true,
      schedule,
      status: 'idle',
    });

    task.start();
    this.logger.log(`[${this.serviceName}] Started daily reports job with schedule: ${schedule}`);
  }

  /**
   * Start the health checks job
   */
  private async startHealthChecksJob(): Promise<void> {
    const jobName = 'healthChecks';
    const schedule = this.config.schedules!.healthChecks!;

    const task = cron.schedule(schedule, async () => {
      await this.executeHealthChecksJob();
    }, {
      scheduled: false,
      timezone: 'America/New_York',
    });

    this.jobs.set(jobName, task);
    this.updateJobStatus(jobName, {
      jobName,
      enabled: true,
      schedule,
      status: 'idle',
    });

    task.start();
    this.logger.log(`[${this.serviceName}] Started health checks job with schedule: ${schedule}`);
  }

  /**
   * Execute the risk monitoring job
   */
  private async executeRiskMonitoringJob(): Promise<void> {
    const jobName = 'riskMonitoring';
    const startTime = Date.now();
    
    this.updateJobStatus(jobName, {
      jobName,
      enabled: true,
      schedule: this.config.schedules!.riskMonitoring!,
      status: 'running',
      lastRun: new Date().toISOString(),
    });

    try {
      const companies = await this.getMonitoredCompanies();
      
      if (companies.length === 0) {
        this.logger.log(`[${this.serviceName}] No companies to monitor for risk`);
        this.updateJobStatus(jobName, {
          jobName,
          enabled: true,
          schedule: this.config.schedules!.riskMonitoring!,
          status: 'idle',
          lastRun: new Date().toISOString(),
        });
        return;
      }

      this.logger.log(`[${this.serviceName}] Starting risk monitoring for ${companies.length} companies`);

      const monitoringResult = await this.riskDetectionService.monitorMultipleCompanies(companies);

      if (monitoringResult.success && monitoringResult.data) {
        const results = monitoringResult.data;
        const companiesProcessed = results.length;
        const alertsTriggered = results.reduce((sum, r) => sum + r.alertsSent, 0);
        const errors = results
          .filter(r => r.errors && r.errors.length > 0)
          .flatMap(r => r.errors || []);

        const duration = Date.now() - startTime;

        // Record job execution
        this.recordJobExecution({
          jobName,
          executedAt: new Date().toISOString(),
          duration,
          success: true,
          companiesProcessed,
          alertsTriggered,
          ...(errors.length > 0 && { errors }),
        });

        this.logger.log(`[${this.serviceName}] Risk monitoring completed: ${companiesProcessed} companies, ${alertsTriggered} alerts`);

        this.updateJobStatus(jobName, {
          jobName,
          enabled: true,
          schedule: this.config.schedules!.riskMonitoring!,
          status: 'idle',
          lastRun: new Date().toISOString(),
          lastResult: { companiesProcessed, alertsTriggered, errors: errors.length },
        });
      } else {
        throw new Error('Risk monitoring failed');
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.recordJobExecution({
        jobName,
        executedAt: new Date().toISOString(),
        duration,
        success: false,
        companiesProcessed: 0,
        alertsTriggered: 0,
        errors: [errorMessage],
      });

      this.updateJobStatus(jobName, {
        jobName,
        enabled: true,
        schedule: this.config.schedules!.riskMonitoring!,
        status: 'error',
        lastRun: new Date().toISOString(),
        errorMessage,
      });

      this.logger.error(`[${this.serviceName}] Risk monitoring job failed:`, error);
    }
  }

  /**
   * Execute the daily reports job
   */
  private async executeDailyReportsJob(): Promise<void> {
    const jobName = 'dailyReports';
    const startTime = Date.now();

    this.updateJobStatus(jobName, {
      jobName,
      enabled: true,
      schedule: this.config.schedules!.dailyReports!,
      status: 'running',
      lastRun: new Date().toISOString(),
    });

    try {
      // Generate daily monitoring statistics
      const statsResult = await this.riskDetectionService.getMonitoringStats();
      
      if (statsResult.success && statsResult.data) {
        const stats = statsResult.data;
        const duration = Date.now() - startTime;

        this.logger.log(`[${this.serviceName}] Daily report: ${stats.totalCompaniesMonitored} companies, ${stats.alertsSentToday} alerts, ${stats.companiesAtRisk} at risk`);

        this.recordJobExecution({
          jobName,
          executedAt: new Date().toISOString(),
          duration,
          success: true,
          companiesProcessed: stats.totalCompaniesMonitored,
          alertsTriggered: stats.alertsSentToday,
        });

        this.updateJobStatus(jobName, {
          jobName,
          enabled: true,
          schedule: this.config.schedules!.dailyReports!,
          status: 'idle',
          lastRun: new Date().toISOString(),
          lastResult: stats,
        });
      } else {
        throw new Error('Failed to generate daily report');
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.recordJobExecution({
        jobName,
        executedAt: new Date().toISOString(),
        duration,
        success: false,
        companiesProcessed: 0,
        alertsTriggered: 0,
        errors: [errorMessage],
      });

      this.updateJobStatus(jobName, {
        jobName,
        enabled: true,
        schedule: this.config.schedules!.dailyReports!,
        status: 'error',
        lastRun: new Date().toISOString(),
        errorMessage,
      });

      this.logger.error(`[${this.serviceName}] Daily reports job failed:`, error);
    }
  }

  /**
   * Execute the health checks job
   */
  private async executeHealthChecksJob(): Promise<void> {
    const jobName = 'healthChecks';
    const startTime = Date.now();

    this.updateJobStatus(jobName, {
      jobName,
      enabled: true,
      schedule: this.config.schedules!.healthChecks!,
      status: 'running',
      lastRun: new Date().toISOString(),
    });

    try {
      // Check service health
      const riskDetectionInfo = this.riskDetectionService.getRiskDetectionInfo();
      const duration = Date.now() - startTime;

      // Log health check results
      this.logger.log(`[${this.serviceName}] Health check: Risk detection ${riskDetectionInfo.configured ? 'healthy' : 'unhealthy'}`);

      this.recordJobExecution({
        jobName,
        executedAt: new Date().toISOString(),
        duration,
        success: riskDetectionInfo.configured,
        companiesProcessed: riskDetectionInfo.statistics.companiesInHistory,
        alertsTriggered: 0,
      });

      this.updateJobStatus(jobName, {
        jobName,
        enabled: true,
        schedule: this.config.schedules!.healthChecks!,
        status: 'idle',
        lastRun: new Date().toISOString(),
        lastResult: riskDetectionInfo,
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.recordJobExecution({
        jobName,
        executedAt: new Date().toISOString(),
        duration,
        success: false,
        companiesProcessed: 0,
        alertsTriggered: 0,
        errors: [errorMessage],
      });

      this.updateJobStatus(jobName, {
        jobName,
        enabled: true,
        schedule: this.config.schedules!.healthChecks!,
        status: 'error',
        lastRun: new Date().toISOString(),
        errorMessage,
      });

      this.logger.error(`[${this.serviceName}] Health checks job failed:`, error);
    }
  }

  /**
   * Get list of companies to monitor
   * @returns Array of company IDs
   */
  private async getMonitoredCompanies(): Promise<string[]> {
    // For now, return configured companies
    // In production, this could query the database for active companies
    return this.config.monitoredCompanies || [];
  }

  /**
   * Update job status
   * @param jobName - Job name
   * @param status - Job status
   */
  private updateJobStatus(jobName: string, status: JobStatus): void {
    this.jobStatuses.set(jobName, status);
  }

  /**
   * Record job execution in history
   * @param result - Job execution result
   */
  private recordJobExecution(result: JobExecutionResult): void {
    this.jobHistory.push(result);
    
    // Keep only last 100 job executions
    if (this.jobHistory.length > 100) {
      this.jobHistory.splice(0, this.jobHistory.length - 100);
    }
  }

  /**
   * Manually trigger a specific job
   * @param jobName - Name of job to trigger
   * @returns Execution result
   */
  async triggerJob(jobName: string): Promise<ServiceResponse<JobExecutionResult>> {
    return this.executeWithErrorHandling(async () => {
      switch (jobName) {
        case 'riskMonitoring':
          await this.executeRiskMonitoringJob();
          break;
        case 'dailyReports':
          await this.executeDailyReportsJob();
          break;
        case 'healthChecks':
          await this.executeHealthChecksJob();
          break;
        default:
          throw new Error(`Unknown job: ${jobName}`);
      }

      // Return the most recent execution result for this job
      const recentResult = this.jobHistory
        .filter(r => r.jobName === jobName)
        .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime())[0];

      if (!recentResult) {
        throw new Error(`No execution result found for job: ${jobName}`);
      }

      return recentResult;
    }, `trigger job ${jobName}`);
  }

  /**
   * Get status of all jobs
   * @returns Job statuses
   */
  async getJobStatuses(): Promise<ServiceResponse<JobStatus[]>> {
    return this.executeWithErrorHandling(async () => {
      const statuses = Array.from(this.jobStatuses.values());
      
      // Update next run times for scheduled jobs
      statuses.forEach(status => {
        if (status.enabled && status.status !== 'disabled') {
          try {
            // Parse cron expression to get next run time
            // This is a simplified version - in production you'd use a proper cron parser
            status.nextRun = 'Next run time calculation would go here';
          } catch (error) {
            // Ignore parsing errors
          }
        }
      });

      return statuses;
    }, 'get job statuses');
  }

  /**
   * Get job execution history
   * @param jobName - Optional job name filter
   * @param limit - Maximum number of results
   * @returns Job execution history
   */
  async getJobHistory(
    jobName?: string,
    limit: number = 50
  ): Promise<ServiceResponse<JobExecutionResult[]>> {
    return this.executeWithErrorHandling(async () => {
      let history = this.jobHistory;

      if (jobName) {
        history = history.filter(r => r.jobName === jobName);
      }

      return history
        .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime())
        .slice(0, limit);
    }, `get job history${jobName ? ` for ${jobName}` : ''}`);
  }

  /**
   * Add a company to monitoring
   * @param companyId - Company identifier
   * @returns Success status
   */
  async addCompanyToMonitoring(companyId: string): Promise<ServiceResponse<boolean>> {
    return this.executeWithErrorHandling(async () => {
      if (!this.config.monitoredCompanies) {
        this.config.monitoredCompanies = [];
      }

      if (!this.config.monitoredCompanies.includes(companyId)) {
        this.config.monitoredCompanies.push(companyId);
        this.logger.log(`[${this.serviceName}] Added company ${companyId} to monitoring`);
        return true;
      }

      return false; // Already being monitored
    }, `add company ${companyId} to monitoring`);
  }

  /**
   * Remove a company from monitoring
   * @param companyId - Company identifier
   * @returns Success status
   */
  async removeCompanyFromMonitoring(companyId: string): Promise<ServiceResponse<boolean>> {
    return this.executeWithErrorHandling(async () => {
      if (!this.config.monitoredCompanies) {
        return false;
      }

      const index = this.config.monitoredCompanies.indexOf(companyId);
      if (index !== -1) {
        this.config.monitoredCompanies.splice(index, 1);
        this.logger.log(`[${this.serviceName}] Removed company ${companyId} from monitoring`);
        return true;
      }

      return false; // Not being monitored
    }, `remove company ${companyId} from monitoring`);
  }

  /**
   * Get service information and statistics
   * @returns Service information
   */
  public getBackgroundJobsInfo(): {
    service: string;
    configured: boolean;
    jobsRunning: number;
    totalJobsExecuted: number;
    companiesMonitored: number;
    configuration: {
      schedules: any;
      enabledJobs: any;
    };
  } {
    const runningJobs = Array.from(this.jobStatuses.values())
      .filter(status => status.status === 'running' || status.status === 'idle').length;

    return {
      service: 'background-jobs',
      configured: true,
      jobsRunning: runningJobs,
      totalJobsExecuted: this.jobHistory.length,
      companiesMonitored: this.config.monitoredCompanies?.length || 0,
      configuration: {
        schedules: this.config.schedules,
        enabledJobs: this.config.enabledJobs,
      },
    };
  }
}
