/**
 * Services Index
 * 
 * Central export point for all service classes and related types.
 * Provides easy imports and service factory functions.
 */

// Base service exports
export { BaseService, ServiceResponse, ServiceError, ServiceConfig } from './base';

// Import services for factory functions
import { PlaidService } from './plaid';
import { CheckService } from './check';
import { SlackService } from './slack';
import { CashFlowAnalysisService, CashFlowConfig } from './cashflow';
import { RiskDetectionService, RiskDetectionConfig } from './risk-detection';
import { BackgroundJobsService, BackgroundJobsConfig } from './background-jobs';

// Plaid service exports
export { 
  PlaidService,
  PlaidConfig,
  PlaidAccount,
  AccountBalance,
  Institution,
  LinkTokenResponse,
  AccessTokenResponse
} from './plaid';

// Check service exports  
export {
  CheckService,
  CheckConfig,
  Employee,
  PayrollRun,
  PayrollEntry,
  PayrollSchedule,
  PayrollSummary
} from './check';

// Slack service exports
export {
  SlackService,
  SlackConfig,
  AlertSeverity,
  RiskAlertData,
  SlackMessageResponse,
  AlertOptions
} from './slack';

// Cash Flow Analysis service exports
export {
  CashFlowAnalysisService,
  CashFlowConfig,
  CashFlowAnalysisResult,
  AlertTrigger
} from './cashflow';

// Risk Detection service exports
export {
  RiskDetectionService,
  RiskDetectionConfig,
  RiskMonitoringResult,
  AlertHistory
} from './risk-detection';

// Background Jobs service exports
export {
  BackgroundJobsService,
  BackgroundJobsConfig,
  JobStatus,
  JobExecutionResult
} from './background-jobs';

/**
 * Service factory functions for easy initialization
 */

/**
 * Create a configured Plaid service instance
 * @param config - Plaid configuration
 * @returns Configured PlaidService instance
 */
export function createPlaidServiceWithConfig(config: {
  clientId: string;
  secret: string;
  environment: 'sandbox' | 'production';
}): PlaidService {
  return new PlaidService({
    ...config,
    apiKey: config.secret, // Map to base config
  });
}

/**
 * Create a configured Check service instance
 * @param config - Check configuration
 * @returns Configured CheckService instance
 */
export function createCheckServiceWithConfig(config: {
  apiKey: string;
  environment: 'sandbox' | 'production';
}): CheckService {
  return new CheckService(config);
}

/**
 * Create a configured Slack service instance
 * @param config - Slack configuration
 * @returns Configured SlackService instance
 */
export function createSlackServiceWithConfig(config: {
  botToken: string;
  channelId: string;
  environment: 'sandbox' | 'production';
}): SlackService {
  return new SlackService({
    ...config,
    apiKey: config.botToken, // Map to base config
  });
}

/**
 * Service configuration from environment variables
 */
export function getServiceConfigFromEnv(): {
  plaid: {
    clientId: string;
    secret: string;
    environment: 'sandbox' | 'production';
  };
  check: {
    apiKey: string;
    environment: 'sandbox' | 'production';
  };
  slack: {
    botToken: string;
    channelId: string;
    environment: 'sandbox' | 'production';
  };
} {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const environment = nodeEnv === 'production' ? 'production' : 'sandbox';

  return {
    plaid: {
      clientId: process.env.PLAID_CLIENT_ID || '',
      secret: process.env.PLAID_SECRET || '',
      environment,
    },
    check: {
      apiKey: process.env.CHECK_API_KEY || 'demo_key',
      environment,
    },
    slack: {
      botToken: process.env.SLACK_BOT_TOKEN || '',
      channelId: process.env.SLACK_CHANNEL_ID || '',
      environment,
    },
  };
}

/**
 * Create a configured Cash Flow Analysis service instance
 * @param config - Cash flow analysis configuration
 * @param plaidService - Plaid service instance
 * @param checkService - Check service instance
 * @param slackService - Optional Slack service instance
 * @returns Configured CashFlowAnalysisService instance
 */
export function createCashFlowAnalysisServiceWithConfig(
  config: CashFlowConfig,
  plaidService: PlaidService,
  checkService: CheckService,
  slackService?: SlackService
): CashFlowAnalysisService {
  return new CashFlowAnalysisService(config, plaidService, checkService, slackService);
}

/**
 * Create a configured Risk Detection service instance
 * @param config - Risk detection configuration
 * @param cashFlowService - Cash flow analysis service instance
 * @param slackService - Optional Slack service instance
 * @returns Configured RiskDetectionService instance
 */
export function createRiskDetectionServiceWithConfig(
  config: RiskDetectionConfig,
  cashFlowService: CashFlowAnalysisService,
  slackService?: SlackService
): RiskDetectionService {
  return new RiskDetectionService(config, cashFlowService, slackService);
}

/**
 * Create a configured Background Jobs service instance
 * @param config - Background jobs configuration
 * @param riskDetectionService - Risk detection service instance
 * @returns Configured BackgroundJobsService instance
 */
export function createBackgroundJobsServiceWithConfig(
  config: BackgroundJobsConfig,
  riskDetectionService: RiskDetectionService
): BackgroundJobsService {
  return new BackgroundJobsService(config, riskDetectionService);
}

/**
 * Initialize all basic services from environment variables
 * @returns Configured basic service instances
 */
export function initializeBasicServices(): {
  plaid: PlaidService;
  check: CheckService;
  slack: SlackService;
} {
  const config = getServiceConfigFromEnv();
  
  return {
    plaid: createPlaidServiceWithConfig(config.plaid),
    check: createCheckServiceWithConfig(config.check),
    slack: createSlackServiceWithConfig(config.slack),
  };
}

/**
 * Initialize all services including business logic services
 * @param companies - Optional list of companies to monitor
 * @returns Configured service instances
 */
export function initializeAllServices(companies: string[] = []): {
  plaid: PlaidService;
  check: CheckService;
  slack: SlackService;
  cashFlow: CashFlowAnalysisService;
  riskDetection: RiskDetectionService;
  backgroundJobs: BackgroundJobsService;
} {
  const config = getServiceConfigFromEnv();
  
  // Initialize basic services
  const plaid = createPlaidServiceWithConfig(config.plaid);
  const check = createCheckServiceWithConfig(config.check);
  const slack = createSlackServiceWithConfig(config.slack);
  
  // Initialize business logic services
  const cashFlow = new CashFlowAnalysisService(
    {
      environment: config.plaid.environment,
      projectionMonths: 3,
      alertFrequency: 'immediate',
    },
    plaid,
    check,
    slack
  );
  
  const riskDetection = new RiskDetectionService(
    {
      environment: config.plaid.environment,
      monitoringInterval: 60,
      alertCooldown: 240,
      maxAlertsPerDay: 10,
      alertChannels: {
        slack: true,
        // email channel disabled
        webhook: false,
      },
    },
    cashFlow,
    slack
  );
  
  const backgroundJobs = new BackgroundJobsService(
    {
      environment: config.plaid.environment,
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
      monitoredCompanies: companies,
    },
    riskDetection
  );
  
  return {
    plaid,
    check,
    slack,
    cashFlow,
    riskDetection,
    backgroundJobs,
  };
}

/**
 * Initialize all services from environment variables (backward compatibility)
 * @returns Configured basic service instances
 */
export function initializeServices(): {
  plaid: PlaidService;
  check: CheckService;
  slack: SlackService;
} {
  return initializeBasicServices();
}

/**
 * Auto-initializing factory functions (read from environment variables)
 */

/**
 * Create a Slack service instance from environment variables
 * @returns Configured SlackService instance
 */
export function createSlackService(): SlackService {
  const config = getServiceConfigFromEnv();
  return new SlackService({
    apiKey: config.slack.botToken,
    environment: config.slack.environment,
    botToken: config.slack.botToken,
    channelId: config.slack.channelId,
  });
}

/**
 * Create a Check service instance from environment variables
 * @returns Configured CheckService instance
 */
export function createCheckService(): CheckService {
  const config = getServiceConfigFromEnv();
  return new CheckService({
    apiKey: config.check.apiKey,
    environment: config.check.environment,
  });
}

/**
 * Create a Plaid service instance from environment variables
 * @returns Configured PlaidService instance
 */
export function createPlaidService(): PlaidService {
  const config = getServiceConfigFromEnv();
  return new PlaidService({
    apiKey: config.plaid.secret,
    environment: config.plaid.environment,
    clientId: config.plaid.clientId,
    secret: config.plaid.secret,
  });
}

/**
 * Create a Cash Flow Analysis service instance from environment variables
 * @returns Configured CashFlowAnalysisService instance
 */
export function createCashFlowAnalysisService(): CashFlowAnalysisService {
  const config = getServiceConfigFromEnv();
  const plaid = createPlaidService();
  const check = createCheckService();
  const slack = createSlackService();
  
  return new CashFlowAnalysisService(
    {
      environment: config.plaid.environment,
      projectionMonths: 3,
      alertFrequency: 'immediate',
    },
    plaid,
    check,
    slack
  );
}

/**
 * Create a Risk Detection service instance from environment variables
 * @param cashFlowService - Cash flow analysis service instance
 * @param slackService - Optional Slack service instance
 * @returns Configured RiskDetectionService instance
 */
export function createRiskDetectionService(
  cashFlowService?: CashFlowAnalysisService,
  slackService?: SlackService
): RiskDetectionService {
  const config = getServiceConfigFromEnv();
  const cashFlow = cashFlowService || createCashFlowAnalysisService();
  const slack = slackService || (config.slack.botToken ? createSlackService() : undefined);
  
  return new RiskDetectionService(
    {
      environment: config.plaid.environment,
      monitoringInterval: 60,
      alertCooldown: 240,
      maxAlertsPerDay: 10,
      alertChannels: {
        slack: !!slack,
        // email channel disabled
        webhook: false,
      },
    },
    cashFlow,
    slack
  );
}
