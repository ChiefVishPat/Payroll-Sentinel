import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
<<<<<<< HEAD:backend/src/test/routes.test.ts
import { createServer } from '@backend/index';

// Mock all the services
vi.mock('@backend/services/cashflow', () => ({
=======
import { createServer } from '@backend/index.js';

// Mock all the services
vi.mock('@backend/services/cashflow.js', () => ({
>>>>>>> vp/clean-up-and-reorganize-codebase:tests/backend/routes.test.ts
  CashFlowService: vi.fn().mockImplementation(() => ({
    getCurrentAnalysis: vi.fn().mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 'cf-1',
            currentBalance: 50000,
            projectedBalance: 45000,
            riskLevel: 'medium',
            lastUpdated: new Date().toISOString()
          }
        ],
        total: 1
      }
    }),
    recalculateAnalysis: vi.fn().mockResolvedValue({
      success: true,
      data: {
        jobId: 'job-123',
        status: 'started',
        estimatedCompletion: new Date(Date.now() + 300000).toISOString()
      }
    })
  }))
}));

<<<<<<< HEAD:backend/src/test/routes.test.ts
vi.mock('@backend/services/riskAssessment', () => ({
=======
vi.mock('@backend/services/riskAssessment.js', () => ({
>>>>>>> vp/clean-up-and-reorganize-codebase:tests/backend/routes.test.ts
  RiskAssessmentService: vi.fn().mockImplementation(() => ({
    getRiskStatus: vi.fn().mockResolvedValue({
      success: true,
      data: {
        riskLevel: 'medium',
        score: 65,
        factors: ['cash_flow', 'payroll_obligations'],
        lastUpdated: new Date().toISOString()
      }
    }),
    getRiskAssessments: vi.fn().mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 'ra-1',
            riskLevel: 'high',
            score: 80,
            status: 'active',
            createdAt: new Date().toISOString()
          }
        ],
        total: 1
      }
    })
  }))
}));

<<<<<<< HEAD:backend/src/test/routes.test.ts
vi.mock('@backend/services/check', () => ({
=======
vi.mock('@backend/services/check.js', () => ({
>>>>>>> vp/clean-up-and-reorganize-codebase:tests/backend/routes.test.ts
  CheckService: vi.fn().mockImplementation(() => ({
    getPayrollRuns: vi.fn().mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 'pr-1',
            status: 'pending',
            payDate: '2024-01-15',
            totalAmount: 50000
          }
        ],
        total: 1
      }
    }),
    getEmployees: vi.fn().mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 'emp-1',
            name: 'John Doe',
            department: 'Engineering',
            active: true
          }
        ],
        total: 1
      }
    })
  }))
}));

<<<<<<< HEAD:backend/src/test/routes.test.ts
vi.mock('@backend/services/plaid', () => ({
=======
vi.mock('@backend/services/plaid.js', () => ({
>>>>>>> vp/clean-up-and-reorganize-codebase:tests/backend/routes.test.ts
  PlaidService: vi.fn().mockImplementation(() => ({
    createLinkToken: vi.fn().mockResolvedValue({
      success: true,
      data: {
        linkToken: 'link-token-123',
        expiration: new Date().toISOString()
      }
    }),
    getAccountsForCompany: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          id: 'acc-1',
          name: 'Business Checking',
          type: 'checking',
          balance: 25000
        }
      ]
    })
  }))
}));

<<<<<<< HEAD:backend/src/test/routes.test.ts
vi.mock('@backend/services/slack', () => ({
=======
vi.mock('@backend/services/slack.js', () => ({
>>>>>>> vp/clean-up-and-reorganize-codebase:tests/backend/routes.test.ts
  SlackService: vi.fn().mockImplementation(() => ({
    sendNotification: vi.fn().mockResolvedValue({
      success: true,
      data: {
        messageId: 'msg-123',
        timestamp: new Date().toISOString()
      }
    }),
    getNotificationHistory: vi.fn().mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 'notif-1',
            type: 'risk_alert',
            status: 'sent',
            timestamp: new Date().toISOString()
          }
        ],
        total: 1
      }
    })
  }))
}));

<<<<<<< HEAD:backend/src/test/routes.test.ts
vi.mock('@backend/services/monitoring', () => ({
=======
vi.mock('@backend/services/monitoring.js', () => ({
>>>>>>> vp/clean-up-and-reorganize-codebase:tests/backend/routes.test.ts
  MonitoringService: vi.fn().mockImplementation(() => ({
    getSystemHealth: vi.fn().mockResolvedValue({
      success: true,
      data: {
        status: 'healthy',
        uptime: '2d 5h 30m',
        services: {
          database: 'healthy',
          cache: 'healthy',
          external: 'healthy'
        }
      }
    }),
    getJobs: vi.fn().mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 'job-1',
            type: 'cash_flow_analysis',
            status: 'completed',
            createdAt: new Date().toISOString()
          }
        ],
        total: 1
      }
    }),
    triggerJob: vi.fn().mockResolvedValue({
      success: true,
      data: {
        jobId: 'job-456',
        status: 'started',
        estimatedCompletion: new Date(Date.now() + 300000).toISOString()
      }
    })
  }))
}));

describe('API Routes', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    server = createServer();
    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  describe('Health Check', () => {
    it('should return system health status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/monitoring/health'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('healthy');
    });
  });

  describe('API Documentation', () => {
    it('should serve swagger documentation', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/docs'
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent routes', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/non-existent'
      });

      expect(response.statusCode).toBe(404);
    });

    it('should handle validation errors', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/cash-flow' // Missing required companyId
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });
  });
});
