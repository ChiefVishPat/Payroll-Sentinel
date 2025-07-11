/**
 * Risk Detection Service
 * 
 * Automated monitoring service that periodically checks cash flow risks
 * and triggers alerts based on configurable thresholds and rules.
 */

import { BaseService, ServiceResponse, ServiceConfig } from './base';
import { CashFlowAnalysisService, CashFlowAnalysisResult, AlertTrigger } from './cashflow';
import { SlackService } from './slack';
import { calculateRiskScore } from '../utils/risk';

export interface RiskDetectionConfig extends ServiceConfig {
  // Monitoring configuration
  monitoringInterval?: number; // Minutes between checks
  alertCooldown?: number; // Minutes to wait before re-alerting
  maxAlertsPerDay?: number; // Maximum alerts per company per day
  
  // Risk thresholds
  thresholds?: {
    critical: {
      riskScore: number;
      daysUntilPayroll: number;
      balanceRatio: number; // Ratio of balance to required float
    };
    warning: {
      riskScore: number;
      daysUntilPayroll: number;
      balanceRatio: number;
    };
  };
  
  // Company-specific settings
  enabledCompanies?: string[];
  alertChannels?: {
    slack?: boolean;
    email?: boolean;
    webhook?: boolean;
  };
}

export interface RiskMonitoringResult {
  companyId: string;
  monitoredAt: string;
  riskDetected: boolean;
  alertsSent: number;
  analysisResult?: CashFlowAnalysisResult;
  alerts?: AlertTrigger[];
  errors?: string[];
}

export interface AlertHistory {
  companyId: string;
  alertType: string;
  severity: string;
  sentAt: string;
  message: string;
  riskScore: number;
}

/**
 * Risk Detection Service
 * Provides automated monitoring and alerting capabilities
 */
export class RiskDetectionService extends BaseService {
  protected override readonly config: RiskDetectionConfig;
  private readonly cashFlowService: CashFlowAnalysisService;
  private readonly slackService: SlackService | undefined;
  
  // In-memory storage for alert history and cooldowns
  // In production, this would be stored in a database
  private alertHistory = new Map<string, AlertHistory[]>();
  private lastAlertTimes = new Map<string, number>();

  constructor(
    config: RiskDetectionConfig,
    cashFlowService: CashFlowAnalysisService,
    slackService?: SlackService
  ) {
    super('risk-detection', config);
    this.config = {
      monitoringInterval: 60, // 1 hour
      alertCooldown: 240, // 4 hours
      maxAlertsPerDay: 10,
      thresholds: {
        critical: {
          riskScore: 80,
          daysUntilPayroll: 2,
          balanceRatio: 0.8,
        },
        warning: {
          riskScore: 60,
          daysUntilPayroll: 7,
          balanceRatio: 1.2,
        },
      },
      enabledCompanies: [],
      alertChannels: {
        slack: true,
        // email alerts disabled in sandbox
        webhook: false,
      },
      ...config,
    };
    this.cashFlowService = cashFlowService;
    this.slackService = slackService;
  }

  /**
   * Monitor risk for a specific company
   * @param companyId - Company identifier
   * @returns Monitoring result
   */
  async monitorCompanyRisk(companyId: string): Promise<ServiceResponse<RiskMonitoringResult>> {
    return this.executeWithErrorHandling(async () => {
      const monitoredAt = new Date().toISOString();
      const errors: string[] = [];
      let riskDetected = false;
      let alertsSent = 0;
      let analysisResult: CashFlowAnalysisResult | undefined = undefined;
      let alerts: AlertTrigger[] = [];

      try {
        // Step 1: Perform cash flow analysis
        const analysisResponse = await this.cashFlowService.performAnalysis(companyId);
        
        if (!analysisResponse.success || !analysisResponse.data) {
          errors.push('Failed to perform cash flow analysis');
          return {
            companyId,
            monitoredAt,
            riskDetected: false,
            alertsSent: 0,
            errors,
          };
        }

        analysisResult = analysisResponse.data;

        // Step 2: Check if risk thresholds are exceeded
        riskDetected = this.evaluateRiskThresholds(analysisResult);

        if (riskDetected) {
          // Step 3: Check for alert triggers
          const alertsResponse = await this.cashFlowService.checkForAlerts(analysisResult);
          
          if (alertsResponse.success && alertsResponse.data) {
            alerts = alertsResponse.data;
            
            // Step 4: Filter alerts based on cooldown and limits
            const filteredAlerts = this.filterAlerts(companyId, alerts);
            
            // Step 5: Send filtered alerts
            if (filteredAlerts.length > 0) {
              const alertResults = await this.sendFilteredAlerts(companyId, filteredAlerts, analysisResult);
              alertsSent = alertResults.sent;
              
              if (alertResults.failed > 0) {
                errors.push(`${alertResults.failed} alerts failed to send`);
              }
            }
          } else {
            errors.push('Failed to check for alert triggers');
          }
        }

      } catch (error) {
        errors.push(`Monitoring error: ${error instanceof Error ? error.message : String(error)}`);
      }

        const result: RiskMonitoringResult = {
          companyId,
          monitoredAt,
          riskDetected,
          alertsSent,
          ...(analysisResult && { analysisResult }),
          ...(alerts.length > 0 && { alerts }),
          ...(errors.length > 0 && { errors }),
        };
        return result;
    }, `monitor risk for company ${companyId}`);
  }

  /**
   * Monitor risk for multiple companies
   * @param companyIds - Array of company identifiers
   * @returns Array of monitoring results
   */
  async monitorMultipleCompanies(
    companyIds: string[]
  ): Promise<ServiceResponse<RiskMonitoringResult[]>> {
    return this.executeWithErrorHandling(async () => {
      const results: RiskMonitoringResult[] = [];

      for (const companyId of companyIds) {
        try {
          const monitorResult = await this.monitorCompanyRisk(companyId);
          
          if (monitorResult.success && monitorResult.data) {
            results.push(monitorResult.data);
          } else {
            results.push({
              companyId,
              monitoredAt: new Date().toISOString(),
              riskDetected: false,
              alertsSent: 0,
              errors: [`Failed to monitor: ${monitorResult.error?.message}`],
            });
          }
        } catch (error) {
          results.push({
            companyId,
            monitoredAt: new Date().toISOString(),
            riskDetected: false,
            alertsSent: 0,
            errors: [`Monitoring error: ${error instanceof Error ? error.message : String(error)}`],
          });
        }
      }

      return results;
    }, `monitor multiple companies (${companyIds.length})`);
  }

  /**
   * Evaluate if analysis results exceed risk thresholds
   * @param analysis - Cash flow analysis result
   * @returns True if risk thresholds are exceeded
   */
  private evaluateRiskThresholds(analysis: CashFlowAnalysisResult): boolean {
    const riskScore = calculateRiskScore(analysis.analysis);
    const { critical, warning } = this.config.thresholds!;

    // Check critical thresholds
    if (
      riskScore >= critical.riskScore ||
      analysis.analysis.daysUntilRisk <= critical.daysUntilPayroll ||
      analysis.analysis.riskLevel === 'critical'
    ) {
      return true;
    }

    // Check warning thresholds
    if (
      riskScore >= warning.riskScore ||
      analysis.analysis.daysUntilRisk <= warning.daysUntilPayroll ||
      analysis.analysis.riskLevel === 'warning'
    ) {
      return true;
    }

    // Check balance ratio thresholds
    if (analysis.analysis.requiredFloat > 0) {
      const balanceRatio = analysis.analysis.currentBalance / analysis.analysis.requiredFloat;
      
      if (balanceRatio <= critical.balanceRatio || balanceRatio <= warning.balanceRatio) {
        return true;
      }
    }

    return false;
  }

  /**
   * Filter alerts based on cooldown periods and daily limits
   * @param companyId - Company identifier
   * @param alerts - Alert triggers to filter
   * @returns Filtered alerts
   */
  private filterAlerts(companyId: string, alerts: AlertTrigger[]): AlertTrigger[] {
    const now = Date.now();
    const cooldownMs = this.config.alertCooldown! * 60 * 1000;
    const oneDayMs = 24 * 60 * 60 * 1000;

    // Check cooldown period
    const lastAlertTime = this.lastAlertTimes.get(companyId) || 0;
    if (now - lastAlertTime < cooldownMs) {
      this.logger.log(`[${this.serviceName}] Company ${companyId} in alert cooldown period`);
      return [];
    }

    // Check daily alert limit
    const history = this.alertHistory.get(companyId) || [];
    const todayAlerts = history.filter(alert => 
      now - new Date(alert.sentAt).getTime() < oneDayMs
    );

    if (todayAlerts.length >= this.config.maxAlertsPerDay!) {
      this.logger.log(`[${this.serviceName}] Company ${companyId} has reached daily alert limit`);
      return [];
    }

    // Filter out duplicate alert types from recent history
    const recentAlerts = history.filter(alert => 
      now - new Date(alert.sentAt).getTime() < cooldownMs
    );
    const recentAlertTypes = new Set(recentAlerts.map(alert => alert.alertType));

    return alerts.filter(alert => 
      alert.shouldNotify && !recentAlertTypes.has(alert.alertType)
    );
  }

  /**
   * Send filtered alerts and update history
   * @param companyId - Company identifier
   * @param alerts - Alerts to send
   * @param analysisResult - Cash flow analysis result for context
   * @returns Send results
   */
  private async sendFilteredAlerts(
    companyId: string,
    alerts: AlertTrigger[],
    analysisResult?: CashFlowAnalysisResult
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const alert of alerts) {
      try {
        // Send via configured channels
        if (this.config.alertChannels?.slack && this.slackService) {
          const slackResult = await this.sendSlackAlert(alert, analysisResult);
          
          if (slackResult) {
            sent++;
            this.recordAlertHistory(companyId, alert);
            this.lastAlertTimes.set(companyId, Date.now());
          } else {
            failed++;
          }
        } else {
          // If no channels configured, just record as sent for testing
          sent++;
          this.recordAlertHistory(companyId, alert);
          this.lastAlertTimes.set(companyId, Date.now());
        }
      } catch (error) {
        failed++;
        this.logger.error(`Failed to send alert for ${companyId}:`, error);
      }
    }

    return { sent, failed };
  }

  /**
   * Send alert via Slack
   * @param alert - Alert to send
   * @param analysisResult - Cash flow analysis result for context
   * @returns Success status
   */
  private async sendSlackAlert(alert: AlertTrigger, analysisResult?: CashFlowAnalysisResult): Promise<boolean> {
    if (!this.slackService) {
      return false;
    }

    try {
      // Map risk level to Slack expected format
      const mapRiskLevel = (level: string): 'safe' | 'at_risk' | 'critical' => {
        switch (level) {
          case 'warning': return 'at_risk';
          case 'critical': return 'critical';
          default: return 'safe';
        }
      };

      // Use real data from analysis if available
      const analysis = analysisResult?.analysis;
      const currentBalance = analysis?.currentBalance || 0;
      const requiredFloat = analysis?.requiredFloat || 0;
      const nextPayrollAmount = analysis?.nextPayrollAmount || 0;
      const nextPayrollDate = analysis?.nextPayrollDate || new Date().toISOString();
      
      // Calculate days until payroll
      const daysUntilPayroll = analysis?.nextPayrollDate 
        ? Math.ceil((new Date(analysis.nextPayrollDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;

      const alertData = {
        companyName: `Company ${alert.companyId}`,
        riskLevel: mapRiskLevel(analysis?.riskLevel || 'safe'),
        currentBalance,
        requiredFloat,
        daysUntilPayroll,
        payrollDate: nextPayrollDate,
        payrollAmount: nextPayrollAmount,
      };

      const result = await this.slackService.sendRiskAlert(alertData, {
        severity: alert.severity as any,
        mentionUsers: alert.severity === 'critical' ? ['@channel'] : [],
      });

      return result.success;
    } catch (error) {
      this.logger.error('Failed to send Slack alert:', error);
      return false;
    }
  }

  /**
   * Record alert in history
   * @param companyId - Company identifier
   * @param alert - Alert trigger
   */
  private recordAlertHistory(companyId: string, alert: AlertTrigger): void {
    const history = this.alertHistory.get(companyId) || [];
    
    history.push({
      companyId,
      alertType: alert.alertType,
      severity: alert.severity,
      sentAt: new Date().toISOString(),
      message: alert.message,
      riskScore: alert.riskScore,
    });

    // Keep only last 100 alerts per company
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }

    this.alertHistory.set(companyId, history);
  }

  /**
   * Get alert history for a company
   * @param companyId - Company identifier
   * @param limit - Maximum number of alerts to return
   * @returns Alert history
   */
  async getAlertHistory(
    companyId: string,
    limit: number = 50
  ): Promise<ServiceResponse<AlertHistory[]>> {
    return this.executeWithErrorHandling(async () => {
      const history = this.alertHistory.get(companyId) || [];
      
      return history
        .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
        .slice(0, limit);
    }, `get alert history for company ${companyId}`);
  }

  /**
   * Get monitoring statistics
   * @returns Monitoring statistics
   */
  async getMonitoringStats(): Promise<ServiceResponse<{
    totalCompaniesMonitored: number;
    alertsSentToday: number;
    averageRiskScore: number;
    companiesAtRisk: number;
    lastMonitoringRun?: string;
  }>> {
    return this.executeWithErrorHandling(async () => {
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      
      let totalAlerts = 0;
      let totalRiskScore = 0;
      let companiesAtRisk = 0;
      const monitoredCompanies = new Set<string>();

      // Aggregate statistics from alert history
      for (const [companyId, history] of this.alertHistory.entries()) {
        monitoredCompanies.add(companyId);
        
        const todayAlerts = history.filter(alert => 
          now - new Date(alert.sentAt).getTime() < oneDayMs
        );
        
        totalAlerts += todayAlerts.length;
        
        if (todayAlerts.length > 0) {
          companiesAtRisk++;
          const avgRiskScore = todayAlerts.reduce((sum, alert) => sum + alert.riskScore, 0) / todayAlerts.length;
          totalRiskScore += avgRiskScore;
        }
      }

      const averageRiskScore = companiesAtRisk > 0 ? totalRiskScore / companiesAtRisk : 0;

      return {
        totalCompaniesMonitored: monitoredCompanies.size,
        alertsSentToday: totalAlerts,
        averageRiskScore: Math.round(averageRiskScore * 100) / 100,
        companiesAtRisk,
      };
    }, 'get monitoring statistics');
  }

  /**
   * Test alert system for a company
   * @param companyId - Company identifier
   * @returns Test result
   */
  async testAlerts(companyId: string): Promise<ServiceResponse<{
    testSent: boolean;
    channels: string[];
    errors?: string[];
  }>> {
    return this.executeWithErrorHandling(async () => {
      const channels: string[] = [];
      const errors: string[] = [];
      let testSent = false;

      // Test Slack alerts
      if (this.config.alertChannels?.slack && this.slackService) {
        try {
          // Get real cash flow data for the test
          const analysisResponse = await this.cashFlowService.performAnalysis(companyId);
          
          const testAlert: AlertTrigger = {
            companyId,
            alertType: 'low_balance',
            severity: 'info',
            message: '🧪 TEST ALERT: This is a test of the payroll sentinel alert system.',
            riskScore: 0,
            triggeredAt: new Date().toISOString(),
            shouldNotify: true,
          };

          const sent = await this.sendSlackAlert(
            testAlert, 
            analysisResponse.success ? analysisResponse.data : undefined
          );
          
          if (sent) {
            channels.push('slack');
            testSent = true;
          } else {
            errors.push('Failed to send Slack test alert');
          }
        } catch (error) {
          errors.push(`Slack test error: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      const result: { testSent: boolean; channels: string[]; errors?: string[] } = {
        testSent,
        channels,
        ...(errors.length > 0 && { errors }),
      };
      return result;
    }, `test alerts for company ${companyId}`);
  }

  /**
   * Get service configuration and status
   * @returns Service information
   */
  public getRiskDetectionInfo(): {
    service: string;
    configured: boolean;
    monitoringEnabled: boolean;
    configuration: {
      monitoringInterval: number;
      alertCooldown: number;
      maxAlertsPerDay: number;
      enabledChannels: string[];
    };
    statistics: {
      companiesInHistory: number;
      totalAlertsStored: number;
    };
  } {
    const enabledChannels: string[] = [];
    if (this.config.alertChannels?.slack) enabledChannels.push('slack');
    // email channel intentionally ignored
    if (this.config.alertChannels?.webhook) enabledChannels.push('webhook');

    const totalAlerts = Array.from(this.alertHistory.values())
      .reduce((sum, history) => sum + history.length, 0);

    return {
      service: 'risk-detection',
      configured: true,
      monitoringEnabled: enabledChannels.length > 0,
      configuration: {
        monitoringInterval: this.config.monitoringInterval || 60,
        alertCooldown: this.config.alertCooldown || 240,
        maxAlertsPerDay: this.config.maxAlertsPerDay || 10,
        enabledChannels,
      },
      statistics: {
        companiesInHistory: this.alertHistory.size,
        totalAlertsStored: totalAlerts,
      },
    };
  }
}
