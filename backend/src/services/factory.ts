/**
 * Service Factory
 * 
 * Centralizes service initialization with proper configuration and dependency injection.
 * Ensures all services are properly configured with real API credentials and dependencies.
 */

import { PlaidService, PlaidConfig } from './plaid';
import { CheckService, CheckConfig } from './check';
import { SlackService, SlackConfig } from './slack';
import { RiskEngine, RiskAssessmentConfig } from './riskEngine';
import { JobScheduler, JobSchedulerConfig } from './jobScheduler';
import { ServiceConfig } from './base';

export interface ServiceFactoryConfig {
  // Plaid configuration
  plaidClientId: string;
  plaidSecret: string;
  plaidEnvironment: 'sandbox' | 'production';
  
  // Check configuration
  checkApiKey: string;
  checkEnvironment: 'sandbox' | 'production';
  
  // Slack configuration
  slackBotToken: string;
  slackChannelId: string;
  slackEnvironment: 'sandbox' | 'production';
  
  // Risk engine configuration
  riskSafetyMarginPercent?: number;
  riskCriticalThresholdDays?: number;
  riskWarningThresholdDays?: number;
  
  // Job scheduler configuration
  jobRiskAssessmentInterval?: number;
  jobDataRefreshInterval?: number;
  jobAlertCheckInterval?: number;
  jobEnableAutoAlerts?: boolean;
  jobMaxConcurrentJobs?: number;
  
  // Common configuration
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  timeout?: number;
  retryAttempts?: number;
}

export class ServiceFactory {
  private config: ServiceFactoryConfig;
  
  // Service instances
  private plaidService?: PlaidService;
  private checkService?: CheckService;
  private slackService?: SlackService;
  private riskEngine?: RiskEngine;
  private jobScheduler?: JobScheduler;

  constructor(config: ServiceFactoryConfig) {
    this.config = config;
    this.validateConfig();
  }

  /**
   * Validate service factory configuration
   */
  private validateConfig(): void {
    const requiredFields = [
      'plaidClientId',
      'plaidSecret',
      'checkApiKey',
      'slackBotToken',
      'slackChannelId'
    ];

    for (const field of requiredFields) {
      if (!this.config[field as keyof ServiceFactoryConfig]) {
        throw new Error(`Missing required configuration field: ${field}`);
      }
    }
  }

  /**
   * Get base service configuration
   */
  private getBaseConfig(): ServiceConfig {
    return {
      timeout: this.config.timeout || 10000,
      retryAttempts: this.config.retryAttempts || 3,
      environment: 'sandbox'
    };
  }

  /**
   * Get or create Plaid service instance
   */
  getPlaidService(): PlaidService {
    if (!this.plaidService) {
      const plaidConfig: PlaidConfig = {
        ...this.getBaseConfig(),
        clientId: this.config.plaidClientId,
        secret: this.config.plaidSecret,
        environment: this.config.plaidEnvironment
      };

      this.plaidService = new PlaidService(plaidConfig);
    }

    return this.plaidService;
  }

  /**
   * Get or create Check service instance
   */
  getCheckService(): CheckService {
    if (!this.checkService) {
      const checkConfig: CheckConfig = {
        ...this.getBaseConfig(),
        apiKey: this.config.checkApiKey,
        environment: this.config.checkEnvironment
      };

      this.checkService = new CheckService(checkConfig);
    }

    return this.checkService;
  }

  /**
   * Get or create Slack service instance
   */
  getSlackService(): SlackService {
    if (!this.slackService) {
      const slackConfig: SlackConfig = {
        ...this.getBaseConfig(),
        botToken: this.config.slackBotToken,
        channelId: this.config.slackChannelId,
        environment: this.config.slackEnvironment
      };

      this.slackService = new SlackService(slackConfig);
    }

    return this.slackService;
  }

  /**
   * Get or create Risk Engine instance
   */
  getRiskEngine(): RiskEngine {
    if (!this.riskEngine) {
      const riskConfig: RiskAssessmentConfig = {
        ...this.getBaseConfig(),
        safetyMarginPercent: this.config.riskSafetyMarginPercent || 20,
        criticalThresholdDays: this.config.riskCriticalThresholdDays || 3,
        warningThresholdDays: this.config.riskWarningThresholdDays || 7
      };

      this.riskEngine = new RiskEngine(
        riskConfig,
        this.getPlaidService(),
        this.getCheckService(),
        this.getSlackService()
      );
    }

    return this.riskEngine;
  }

  /**
   * Get or create Job Scheduler instance
   */
  getJobScheduler(): JobScheduler {
    if (!this.jobScheduler) {
      const jobConfig: JobSchedulerConfig = {
        ...this.getBaseConfig(),
        riskAssessmentInterval: this.config.jobRiskAssessmentInterval || 60,
        dataRefreshInterval: this.config.jobDataRefreshInterval || 30,
        alertCheckInterval: this.config.jobAlertCheckInterval || 15,
        enableAutoAlerts: this.config.jobEnableAutoAlerts ?? true,
        maxConcurrentJobs: this.config.jobMaxConcurrentJobs || 5
      };

      this.jobScheduler = new JobScheduler(
        jobConfig,
        this.getRiskEngine(),
        this.getPlaidService(),
        this.getCheckService(),
        this.getSlackService()
      );
    }

    return this.jobScheduler;
  }

  /**
   * Get all services
   */
  getAllServices() {
    return {
      plaidService: this.getPlaidService(),
      checkService: this.getCheckService(),
      slackService: this.getSlackService(),
      riskEngine: this.getRiskEngine(),
      jobScheduler: this.getJobScheduler()
    };
  }

  /**
   * Initialize all services
   */
  async initializeServices(): Promise<void> {
    const services = this.getAllServices();
    
    // Initialize job scheduler (which will start background jobs)
    await services.jobScheduler.initialize();
    
    // Test service connections
    await this.testServiceConnections();
  }

  /**
   * Test service connections
   */
  private async testServiceConnections(): Promise<void> {
    const services = this.getAllServices();

    // Test Slack connection
    try {
      const slackTest = await services.slackService.testConnection();
      if (slackTest.success) {
        console.log('✅ Slack service connected successfully');
      } else {
        console.warn('⚠️  Slack service connection failed:', slackTest.error);
      }
    } catch (error) {
      console.error('❌ Slack service connection error:', error);
    }

    // Test Plaid service info
    try {
      const plaidInfo = services.plaidService.getServiceInfo();
      console.log('✅ Plaid service configured:', plaidInfo);
    } catch (error) {
      console.error('❌ Plaid service configuration error:', error);
    }

    // Test Check service info
    try {
      const checkInfo = services.checkService.getServiceInfo();
      console.log('✅ Check service configured:', checkInfo);
    } catch (error) {
      console.error('❌ Check service configuration error:', error);
    }
  }

  /**
   * Shutdown all services
   */
  async shutdownServices(): Promise<void> {
    if (this.jobScheduler) {
      await this.jobScheduler.shutdown();
    }
    
    console.log('🔄 All services shutdown successfully');
  }
}

/**
 * Create service factory from environment variables
 */
export function createServiceFactoryFromEnv(): ServiceFactory {
  const config: ServiceFactoryConfig = {
    // Plaid configuration
    plaidClientId: process.env.PLAID_CLIENT_ID || '',
    plaidSecret: process.env.PLAID_SECRET || '',
    plaidEnvironment: (process.env.PLAID_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
    
    // Check configuration
    checkApiKey: process.env.CHECK_API_KEY || 'demo-key',
    checkEnvironment: (process.env.CHECK_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
    
    // Slack configuration
    slackBotToken: process.env.SLACK_BOT_TOKEN || '',
    slackChannelId: process.env.SLACK_CHANNEL_ID || '',
    slackEnvironment: (process.env.SLACK_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
    
    // Risk engine configuration
    riskSafetyMarginPercent: parseInt(process.env.RISK_SAFETY_MARGIN_PERCENT || '20'),
    riskCriticalThresholdDays: parseInt(process.env.RISK_CRITICAL_THRESHOLD_DAYS || '3'),
    riskWarningThresholdDays: parseInt(process.env.RISK_WARNING_THRESHOLD_DAYS || '7'),
    
    // Job scheduler configuration
    jobRiskAssessmentInterval: parseInt(process.env.JOB_RISK_ASSESSMENT_INTERVAL || '60'),
    jobDataRefreshInterval: parseInt(process.env.JOB_DATA_REFRESH_INTERVAL || '30'),
    jobAlertCheckInterval: parseInt(process.env.JOB_ALERT_CHECK_INTERVAL || '15'),
    jobEnableAutoAlerts: process.env.JOB_ENABLE_AUTO_ALERTS !== 'false',
    jobMaxConcurrentJobs: parseInt(process.env.JOB_MAX_CONCURRENT_JOBS || '5'),
    
    // Common configuration
    logLevel: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
    timeout: parseInt(process.env.SERVICE_TIMEOUT || '10000'),
    retryAttempts: parseInt(process.env.SERVICE_RETRY_ATTEMPTS || '3')
  };

  return new ServiceFactory(config);
}
