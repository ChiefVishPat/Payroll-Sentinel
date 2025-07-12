// @ts-nocheck
import { FastifyInstance } from 'fastify';
import {
  handleRoute,
  validateRequired,
  validateString,
  validateEnum,
  parsePagination,
  formatPaginatedResponse,
  mapServiceError
} from '@backend/routes/helpers';
import { ApiError, ErrorType } from '@backend/middleware';
import { SlackService } from '@backend/services/slack';

interface NotificationFilters {
  companyId?: string;
  type?: 'risk_alert' | 'cash_flow_alert' | 'payroll_alert' | 'system_alert';
  status?: 'sent' | 'delivered' | 'failed' | 'pending';
  channel?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

async function notificationRoutes(fastify: FastifyInstance) {
  const slackService = new SlackService({
    botToken: process.env.SLACK_BOT_TOKEN || 'default-bot-token',
    channelId: process.env.SLACK_CHANNEL_ID || 'default-channel-id',
    environment: (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production'
  });
  
  /**
   * Send notification to Slack
   * POST /api/notifications/send
   * Body: { companyId, channel, message, type?, priority?, mentions? }
   */
  fastify.post('/notifications/send', handleRoute(async (request, _reply) => {
    const body = request.body as any;
    
    validateRequired(body.companyId, 'companyId');
    validateString(body.companyId, 'companyId');
    
    validateString(body.channel, 'channel');
    
    validateRequired(body.message, 'message');
    const message = validateString(body.message, 'message');
    
    const type = body.type || 'system_alert';
    const priority = body.priority || 'medium';
    const mentions = body.mentions || [];
    
    try {
      const result = await slackService.sendNotification(
        type,
        message,
        priority === 'critical' ? 'critical' : priority === 'high' ? 'warning' : 'info',
        mentions
      );
      
      if (!result.success || !result.data) {
        throw new ApiError(ErrorType.EXTERNAL_SERVICE_ERROR, 'Failed to send notification');
      }
      
      return {
        success: true,
        message: 'Notification sent successfully',
        messageId: result.data?.messageId || `msg_${Date.now()}`,
        timestamp: result.data?.timestamp || new Date().toISOString()
      };
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Send risk alert notification
   * POST /api/notifications/risk-alert
   * Body: { companyId, riskData, channel?, mentions? }
   */
  fastify.post('/notifications/risk-alert', handleRoute(async (request, _reply) => {
    const body = request.body as any;
    
    validateRequired(body.companyId, 'companyId');
    validateString(body.companyId, 'companyId');
    
    validateRequired(body.riskData, 'riskData');
    const riskData = body.riskData;
    
    const channel = body.channel;
    const mentions = body.mentions || [];
    
    try {
      const result = await slackService.sendRiskAlert(riskData, {
        channel,
        mentions,
        severity: 'warning'
      });
      
      if (!result.success || !result.data) {
        throw new ApiError(ErrorType.EXTERNAL_SERVICE_ERROR, 'Failed to send risk alert');
      }
      
      return {
        success: true,
        message: 'Risk alert sent successfully',
        messageId: result.data?.messageId || `msg_${Date.now()}`,
        timestamp: result.data?.timestamp || new Date().toISOString()
      };
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Send cash flow alert notification
   * POST /api/notifications/cash-flow-alert
   * Body: { companyId, cashFlowData, channel?, mentions? }
   */
  fastify.post('/notifications/cash-flow-alert', handleRoute(async (request, _reply) => {
    const body = request.body as any;
    
    validateRequired(body.companyId, 'companyId');
    const companyId = validateString(body.companyId, 'companyId');
    
    validateRequired(body.cashFlowData, 'cashFlowData');
    const cashFlowData = body.cashFlowData;
    
    const channel = body.channel;
    const mentions = body.mentions || [];
    
    try {
      const result = await slackService.sendCashFlowAlert(companyId, cashFlowData, {
        channel,
        mentions
      });
      
      return {
        success: true,
        message: 'Cash flow alert sent successfully',
        messageId: result.data?.messageId || `msg_${Date.now()}`,
        timestamp: result.data?.timestamp || new Date().toISOString()
      };
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get notification history
   * GET /api/notifications
   * Query params: companyId, type, status, channel, priority, page, limit
   */
  fastify.get('/notifications', handleRoute(async (request, _reply) => {
    const query = request.query as any;
    const pagination = parsePagination(query);
    
    validateRequired(query.companyId, 'companyId');
    const companyId = validateString(query.companyId, 'companyId');
    
    const filters: NotificationFilters = { companyId };
    
    if (query.type) {
      filters.type = validateEnum(
        query.type,
        'type',
        ['risk_alert', 'cash_flow_alert', 'payroll_alert', 'system_alert']
      ) as 'risk_alert' | 'cash_flow_alert' | 'payroll_alert' | 'system_alert';
    }
    
    if (query.status) {
      filters.status = validateEnum(
        query.status,
        'status',
        ['sent', 'delivered', 'failed', 'pending']
      ) as 'sent' | 'delivered' | 'failed' | 'pending';
    }
    
    if (query.channel) {
      filters.channel = validateString(query.channel, 'channel');
    }
    
    if (query.priority) {
      filters.priority = validateEnum(
        query.priority,
        'priority',
        ['low', 'medium', 'high', 'critical']
      ) as 'low' | 'medium' | 'high' | 'critical';
    }
    
    try {
      const result = await slackService.getNotificationHistory(filters, pagination);
      if (!result.success || !result.data) {
        throw new Error('Failed to get notifications');
      }
      return formatPaginatedResponse(result.data.items, result.data.total, pagination);
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get specific notification details
   * GET /api/notifications/:notificationId
   * Path params: notificationId
   */
  fastify.get('/notifications/:notificationId', handleRoute(async (request, _reply) => {
    const params = request.params as any;
    
    const notificationId = validateString(params.notificationId, 'notificationId');
    
    try {
      const notification = await slackService.getNotificationById(notificationId);
      
      return notification;
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Update notification message
   * PUT /api/notifications/:notificationId
   * Path params: notificationId
   * Body: { message, companyId }
   */
  fastify.put('/notifications/:notificationId', handleRoute(async (request, _reply) => {
    const params = request.params as any;
    const body = request.body as any;
    
    const notificationId = validateString(params.notificationId, 'notificationId');
    
    validateRequired(body.companyId, 'companyId');
    validateString(body.companyId, 'companyId');
    
    validateRequired(body.message, 'message');
    const message = validateString(body.message, 'message');
    
    try {
      const result = await slackService.updateMessage(notificationId, message);
      
      if (!result.success || !result.data) {
        throw new Error('Failed to update notification');
      }
      
      return {
        success: true,
        message: 'Notification updated successfully',
        messageId: 'updated',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Delete notification
   * DELETE /api/notifications/:notificationId
   * Path params: notificationId
   * Body: { companyId }
   */
  fastify.delete('/notifications/:notificationId', handleRoute(async (request, _reply) => {
    const params = request.params as any;
    const body = request.body as any;
    
    const notificationId = validateString(params.notificationId, 'notificationId');
    
    validateRequired(body.companyId, 'companyId');
    const companyId = validateString(body.companyId, 'companyId');
    
    try {
      await slackService.deleteMessage(notificationId, companyId);
      
      return {
        success: true,
        message: 'Notification deleted successfully'
      };
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Test Slack connection
   * POST /api/notifications/test-connection
   * Body: { companyId, channel? }
   */
  fastify.post('/notifications/test-connection', handleRoute(async (request, _reply) => {
    const body = request.body as any;
    
    validateRequired(body.companyId, 'companyId');
    validateString(body.companyId, 'companyId');
    
    // const channel = body.channel;
    
    try {
      const result = await slackService.testConnection();
      
      return {
        success: true,
        message: 'Slack connection test successful',
        connectionStatus: result.data ? 'connected' : 'disconnected',
        channels: [slackService.getServiceInfo().channelId],
        botInfo: { name: 'Warp Sentinel Bot' }
      };
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get available Slack channels
   * GET /api/notifications/channels
   * Query params: companyId, includePrivate
   */
  fastify.get('/notifications/channels', handleRoute(async (request, _reply) => {
    const query = request.query as any;
    
    validateRequired(query.companyId, 'companyId');
    const companyId = validateString(query.companyId, 'companyId');
    
    const includePrivate = query.includePrivate === 'true';
    
    try {
      const channels = await slackService.getChannels(companyId, { includePrivate });
      return channels;
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get Slack workspace info
   * GET /api/notifications/workspace
   * Query params: companyId
   */
  fastify.get('/notifications/workspace', handleRoute(async (request, _reply) => {
    const query = request.query as any;
    
    validateRequired(query.companyId, 'companyId');
    validateString(query.companyId, 'companyId');
    
    try {
      const workspace = await slackService.getWorkspaceInfo();
      return workspace;
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Update notification settings
   * PUT /api/notifications/settings
   * Body: { companyId, settings }
   */
  fastify.put('/notifications/settings', handleRoute(async (request, _reply) => {
    const body = request.body as any;
    
    validateRequired(body.companyId, 'companyId');
    const companyId = validateString(body.companyId, 'companyId');
    
    validateRequired(body.settings, 'settings');
    const settings = body.settings;
    
    try {
      const result = await slackService.updateNotificationSettings(companyId, settings);
      
      return {
        success: true,
        message: 'Notification settings updated successfully',
        settings: result.data
      };
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get notification settings
   * GET /api/notifications/settings
   * Query params: companyId
   */
  fastify.get('/notifications/settings', handleRoute(async (request, _reply) => {
    const query = request.query as any;
    
    validateRequired(query.companyId, 'companyId');
    const companyId = validateString(query.companyId, 'companyId');
    
    try {
      const settings = await slackService.getNotificationSettings(companyId);
      return settings;
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Get notification statistics
   * GET /api/notifications/stats
   * Query params: companyId, startDate, endDate, groupBy
   */
  fastify.get('/notifications/stats', handleRoute(async (request, _reply) => {
    const query = request.query as any;
    
    validateRequired(query.companyId, 'companyId');
    const companyId = validateString(query.companyId, 'companyId');
    
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    
    const groupBy = query.groupBy ? validateEnum(
      query.groupBy,
      'groupBy',
      ['day', 'week', 'month', 'type', 'channel']
    ) : undefined;
    
    try {
      const stats = await slackService.getNotificationStats(companyId, {
        startDate,
        endDate,
        groupBy
      });
      
      return stats;
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Schedule notification
   * POST /api/notifications/schedule
   * Body: { companyId, channel, message, scheduleTime, type?, priority? }
   */
  fastify.post('/notifications/schedule', handleRoute(async (request, _reply) => {
    const body = request.body as any;
    
    validateRequired(body.companyId, 'companyId');
    const companyId = validateString(body.companyId, 'companyId');
    
    validateRequired(body.channel, 'channel');
    const channel = validateString(body.channel, 'channel');
    
    validateRequired(body.message, 'message');
    const message = validateString(body.message, 'message');
    
    validateRequired(body.scheduleTime, 'scheduleTime');
    const scheduleTime = new Date(body.scheduleTime);
    
    const type = body.type || 'system_alert';
    const priority = body.priority || 'medium';
    
    try {
      const result = await slackService.scheduleNotification(companyId, {
        channel,
        message,
        scheduleTime,
        type,
        priority
      });
      
      return {
        success: true,
        message: 'Notification scheduled successfully',
        scheduleId: result.data.scheduleId,
        scheduleTime: result.data.scheduleTime
      };
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
  
  /**
   * Cancel scheduled notification
   * DELETE /api/notifications/schedule/:scheduleId
   * Path params: scheduleId
   * Body: { companyId }
   */
  fastify.delete('/notifications/schedule/:scheduleId', handleRoute(async (request, _reply) => {
    const params = request.params as any;
    const body = request.body as any;
    
    const scheduleId = validateString(params.scheduleId, 'scheduleId');
    
    validateRequired(body.companyId, 'companyId');
    const companyId = validateString(body.companyId, 'companyId');
    
    try {
      await slackService.cancelScheduledNotification(scheduleId, companyId);
      
      return {
        success: true,
        message: 'Scheduled notification cancelled successfully'
      };
    } catch (error) {
      throw mapServiceError(error);
    }
  }));
}

export default notificationRoutes;
// @ts-nocheck
