/**
 * Slack Service
 * 
 * Handles Slack notifications and alerts for the Warp Sentinel system.
 * Sends formatted messages to configured channels when cash flow risks are detected.
 */

import { WebClient } from '@slack/web-api';
import { BaseService, ServiceResponse, ServiceConfig } from './base';

// Slack-specific types and interfaces
export interface SlackConfig extends ServiceConfig {
  botToken: string;
  channelId: string;
  environment: 'sandbox' | 'production';
}

/**
 * Alert severity levels
 */
export type AlertSeverity = 'info' | 'warning' | 'critical';

/**
 * Risk assessment data for alert formatting
 */
export interface RiskAlertData {
  companyName: string;
  currentBalance: number;
  requiredFloat: number;
  payrollDate: string;
  payrollAmount: number;
  daysUntilPayroll: number;
  riskLevel: 'safe' | 'at_risk' | 'critical';
  runwayDays?: number;
}

/**
 * Slack message response
 */
export interface SlackMessageResponse {
  messageId: string;
  timestamp: string;
  channel: string;
  success: boolean;
}

/**
 * Alert message options
 */
export interface AlertOptions {
  severity: AlertSeverity;
  mentionUsers?: string[]; // Slack user IDs to mention
  threadTs?: string; // Thread timestamp for replies
  urgent?: boolean; // Whether to mark as urgent
}

/**
 * Slack service class implementing notification functionality
 */
export class SlackService extends BaseService {
  private client: WebClient;
  private readonly slackConfig: SlackConfig;

  constructor(config: SlackConfig) {
    super('slack', config);
    this.slackConfig = config;
    
    // Validate required Slack configuration
    this.validateConfig(['botToken', 'channelId']);
    
    // Initialize Slack client
    this.client = new WebClient(config.botToken, {
      retryConfig: {
        retries: this.config.retryAttempts || 3,
      },
    });
  }

  /**
   * Send a payroll risk alert to Slack
   * @param riskData - Risk assessment data
   * @param options - Alert options and formatting
   * @returns Slack message response
   */
  async sendRiskAlert(
    riskData: RiskAlertData,
    options: AlertOptions = { severity: 'warning' }
  ): Promise<ServiceResponse<SlackMessageResponse>> {
    return this.executeWithErrorHandling(async () => {
      const message = this.formatRiskAlertMessage(riskData, options);
      
      const messageOptions: any = {
        channel: this.slackConfig.channelId,
        text: message.text,
        blocks: message.blocks,
        unfurl_links: false,
        unfurl_media: false,
      };
      
      if (options.threadTs) {
        messageOptions.thread_ts = options.threadTs;
      }
      
      const response = await this.client.chat.postMessage(messageOptions);

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.error}`);
      }

      return {
        messageId: response.message?.ts || '',
        timestamp: response.ts || '',
        channel: response.channel || this.slackConfig.channelId,
        success: true,
      };
    }, 'send risk alert');
  }

  /**
   * Send a general notification message
   * @param title - Message title
   * @param message - Message content
   * @param severity - Alert severity level
   * @param mentionUsers - Users to mention
   * @returns Slack message response
   */
  async sendNotification(
    title: string,
    message: string,
    severity: AlertSeverity = 'info',
    mentionUsers: string[] = []
  ): Promise<ServiceResponse<SlackMessageResponse>> {
    return this.executeWithErrorHandling(async () => {
      const formattedMessage = this.formatGeneralMessage(title, message, severity, mentionUsers);
      
      const response = await this.client.chat.postMessage({
        channel: this.slackConfig.channelId,
        text: formattedMessage.text,
        blocks: formattedMessage.blocks,
        unfurl_links: false,
        unfurl_media: false,
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.error}`);
      }

      return {
        messageId: response.message?.ts || '',
        timestamp: response.ts || '',
        channel: response.channel || this.slackConfig.channelId,
        success: true,
      };
    }, 'send notification');
  }

  /**
   * Update an existing message (for status updates)
   * @param messageTimestamp - Timestamp of message to update
   * @param newText - New message text
   * @param newBlocks - New message blocks
   * @returns Update response
   */
  async updateMessage(
    messageTimestamp: string,
    newText: string,
    newBlocks?: any[]
  ): Promise<ServiceResponse<boolean>> {
    return this.executeWithErrorHandling(async () => {
      const updateOptions: any = {
        channel: this.slackConfig.channelId,
        ts: messageTimestamp,
        text: newText,
      };
      
      if (newBlocks) {
        updateOptions.blocks = newBlocks;
      }
      
      const response = await this.client.chat.update(updateOptions);

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.error}`);
      }

      return true;
    }, 'update message');
  }

  /**
   * Test Slack connection by sending a test message
   * @returns Connection test result
   */
  async testConnection(): Promise<ServiceResponse<boolean>> {
    return this.executeWithErrorHandling(async () => {
      // Test bot token validity
      const authResponse = await this.client.auth.test();
      
      if (!authResponse.ok) {
        throw new Error(`Authentication failed: ${authResponse.error}`);
      }

      // Test channel access by getting channel info
      const channelResponse = await this.client.conversations.info({
        channel: this.slackConfig.channelId,
      });

      if (!channelResponse.ok) {
        throw new Error(`Channel access failed: ${channelResponse.error}`);
      }

      return true;
    }, 'test connection');
  }

  /**
   * Format risk alert message with rich Slack blocks
   * @param riskData - Risk assessment data
   * @param options - Alert options
   * @returns Formatted Slack message
   */
  private formatRiskAlertMessage(riskData: RiskAlertData, options: AlertOptions): {
    text: string;
    blocks: any[];
  } {
    const {
      companyName,
      currentBalance,
      requiredFloat,
      payrollDate,
      payrollAmount,
      daysUntilPayroll,
      riskLevel,
      runwayDays,
    } = riskData;

    // Determine emoji based on risk level
    const riskEmoji = {
      safe: ':white_check_mark:',
      at_risk: ':warning:',
      critical: ':rotating_light:',
    }[riskLevel];

    // Format currency values
    const formatCurrency = (amount: number): string => 
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);

    // Build mention string
    const mentions = options.mentionUsers?.map(userId => `<@${userId}>`).join(' ') || '';
    
    // Create main alert text
    const alertText = `${riskEmoji} *Payroll Cash Flow Alert* - ${companyName}`;
    
    const shortfall = requiredFloat - currentBalance;
    const shortfallText = shortfall > 0 
      ? `Shortfall: ${formatCurrency(shortfall)}`
      : `Surplus: ${formatCurrency(Math.abs(shortfall))}`;

    // Build Slack blocks for rich formatting
    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${alertText}${mentions ? `\n${mentions}` : ''}`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Current Balance:*\n${formatCurrency(currentBalance)}`,
          },
          {
            type: 'mrkdwn',
            text: `*Required Float:*\n${formatCurrency(requiredFloat)}`,
          },
          {
            type: 'mrkdwn',
            text: `*Payroll Amount:*\n${formatCurrency(payrollAmount)}`,
          },
          {
            type: 'mrkdwn',
            text: `*Pay Date:*\n${payrollDate}`,
          },
          {
            type: 'mrkdwn',
            text: `*Days Until Payroll:*\n${daysUntilPayroll} days`,
          },
          {
            type: 'mrkdwn',
            text: `*Risk Status:*\n${shortfallText}`,
          },
        ],
      },
    ];

    // Add runway information if available
    if (runwayDays !== undefined) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Cash Runway:* ${runwayDays} days at current burn rate`,
        },
      });
    }

    // Add risk level indicator
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: this.getRiskLevelDescription(riskLevel),
      },
    });

    // Add divider
    blocks.push({
      type: 'divider',
    } as any);

    // Add timestamp
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Alert generated at ${new Date().toLocaleString()} | Environment: ${this.slackConfig.environment}`,
        },
      ],
    } as any);

    return {
      text: `${alertText} - ${shortfallText}`, // Fallback text for notifications
      blocks,
    };
  }

  /**
   * Format general notification message
   * @param title - Message title
   * @param message - Message content
   * @param severity - Alert severity
   * @param mentionUsers - Users to mention
   * @returns Formatted Slack message
   */
  private formatGeneralMessage(
    title: string,
    message: string,
    severity: AlertSeverity,
    mentionUsers: string[]
  ): { text: string; blocks: any[] } {
    const severityEmoji = {
      info: ':information_source:',
      warning: ':warning:',
      critical: ':rotating_light:',
    }[severity];

    const mentions = mentionUsers.map(userId => `<@${userId}>`).join(' ');
    const fullTitle = `${severityEmoji} *${title}*`;

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${fullTitle}${mentions ? `\n${mentions}` : ''}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Sent at ${new Date().toLocaleString()} | Warp Sentinel`,
          },
        ],
      },
    ];

    return {
      text: `${title} - ${message}`, // Fallback text
      blocks,
    };
  }

  /**
   * Get descriptive text for risk levels
   * @param riskLevel - Risk level
   * @returns Descriptive text
   */
  private getRiskLevelDescription(riskLevel: 'safe' | 'at_risk' | 'critical'): string {
    switch (riskLevel) {
      case 'safe':
        return ':white_check_mark: *Status: SAFE* - Sufficient cash flow for upcoming payroll';
      case 'at_risk':
        return ':warning: *Status: AT RISK* - Cash flow is tight. Monitor closely and consider funding options';
      case 'critical':
        return ':rotating_light: *Status: CRITICAL* - Insufficient funds for payroll. Immediate action required!';
      default:
        return '*Status: UNKNOWN*';
    }
  }

  /**
   * Get Slack workspace and channel information
   * @returns Workspace and channel details
   */
  async getWorkspaceInfo(): Promise<ServiceResponse<{
    workspaceName: string;
    channelName: string;
    botUserId: string;
    botName: string;
  }>> {
    return this.executeWithErrorHandling(async () => {
      // Get bot info
      const authResponse = await this.client.auth.test();
      if (!authResponse.ok) {
        throw new Error(`Authentication failed: ${authResponse.error}`);
      }

      // Get channel info
      const channelResponse = await this.client.conversations.info({
        channel: this.slackConfig.channelId,
      });
      if (!channelResponse.ok) {
        throw new Error(`Channel info failed: ${channelResponse.error}`);
      }

      return {
        workspaceName: authResponse.team || 'Unknown',
        channelName: channelResponse.channel?.name || 'Unknown',
        botUserId: authResponse.user_id || 'Unknown',
        botName: authResponse.user || 'Warp Sentinel Bot',
      };
    }, 'get workspace info');
  }

  /**
   * Get service configuration and status
   * @returns Service configuration information
   */
  public getServiceInfo(): {
    environment: string;
    configured: boolean;
    channelId: string;
    hasValidToken: boolean;
  } {
    return {
      environment: this.slackConfig.environment,
      configured: !!(this.slackConfig.botToken && this.slackConfig.channelId),
      channelId: this.slackConfig.channelId,
      hasValidToken: this.slackConfig.botToken?.startsWith('xoxb-') || false,
    };
  }
}
