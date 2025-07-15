import axios from 'axios'

// Warn about missing environment variables in development
if (process.env.NODE_ENV !== 'production') {
  if (!process.env.NEXT_PUBLIC_API_SECRET) {
    console.warn('\x1b[33m%s\x1b[0m', 'Warning: NEXT_PUBLIC_API_SECRET missing - using defaults');
  }
  if (!process.env.NEXT_PUBLIC_API_URL) {
    console.warn('\x1b[33m%s\x1b[0m', 'Warning: NEXT_PUBLIC_API_URL missing - using defaults');
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for auth token and logging
apiClient.interceptors.request.use(
  (config) => {
    // Add API secret header automatically
    config.headers['x-api-secret'] = process.env.NEXT_PUBLIC_API_SECRET ?? '';
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for logging and error handling
apiClient.interceptors.response.use(
  (response) => {
    console.info(
      `[API] ${response.config.method!.toUpperCase()} ${response.config.url} → ${response.status}`,
    );
    return response;
  },
  (error) => {
    console.error(
      `[API] ${error.config?.url} → ${error.response?.status}`,
      error.response?.data,
    );
    return Promise.reject(error);
  }
)

// API endpoints
export const api = {
  // Health check
  health: () => apiClient.get('/health'),
  
  // Risk endpoints
  risk: {
    getStatus: (companyId: string = 'demo-company') => apiClient.get(`/api/risk/status?companyId=${companyId}`),
    getAssessments: (companyId: string = 'demo-company') => apiClient.get(`/api/risk/assessments?companyId=${companyId}`),
    getAlerts: (companyId: string = 'demo-company') => apiClient.get(`/api/risk/alerts?companyId=${companyId}`),
    getTrends: (companyId: string = 'demo-company') => apiClient.get(`/api/risk/trends?companyId=${companyId}`),
    triggerAssessment: (companyId: string = 'demo-company') => apiClient.post('/api/risk/assessments/trigger', { companyId }),
    acknowledgeAlert: (alertId: string, companyId: string = 'demo-company') => apiClient.post(`/api/risk/alerts/${alertId}/acknowledge`, { companyId }),
  },
  
  // Cash flow endpoints
  cashFlow: {
    getSummary: (companyId: string = 'demo-company') => apiClient.get(`/api/cash-flow/summary?companyId=${companyId}`),
    getProjections: (companyId: string = 'demo-company') => apiClient.get(`/api/cash-flow/projections?companyId=${companyId}`),
    getSnapshots: (companyId: string = 'demo-company') => apiClient.get(`/api/cash-flow/snapshots?companyId=${companyId}`),
    getTrends: (companyId: string = 'demo-company') => apiClient.get(`/api/cash-flow/trends?companyId=${companyId}`),
    getAlerts: (companyId: string = 'demo-company') => apiClient.get(`/api/cash-flow/alerts?companyId=${companyId}`),
    recalculate: (companyId: string = 'demo-company') => apiClient.post('/api/cash-flow/recalculate', { companyId }),
  },
  
  // Payroll endpoints
  payroll: {
    getRuns: (companyId: string = 'demo-company') => apiClient.get(`/api/payroll/runs?companyId=${companyId}`),
    getEmployees: (companyId: string = 'demo-company') => apiClient.get(`/api/payroll/employees?companyId=${companyId}`),
    getSummary: (companyId: string = 'demo-company') => apiClient.get(`/api/payroll/summary?companyId=${companyId}`),
    addEmployee: (data: Record<string, unknown>) => apiClient.post('/api/payroll/employees', data),
    getEmployee: (id: string) => apiClient.get(`/api/payroll/employees/${id}`),
    updateEmployee: (id: string, data: Record<string, unknown>) =>
      apiClient.put(`/api/payroll/employees/${id}`, data),
    removeEmployee: (id: string) => apiClient.delete(`/api/payroll/employees/${id}`),
    runPayroll: (data: Record<string, unknown>) => apiClient.post('/api/payroll/run', data),
    getUpcoming: (companyId: string = 'demo-company') => apiClient.get(`/api/payroll/upcoming?companyId=${companyId}`),
    getStats: (companyId: string = 'demo-company') => apiClient.get(`/api/payroll/stats?companyId=${companyId}`),
    approveRun: (runId: string, companyId: string = 'demo-company') => apiClient.post(`/api/payroll/runs/${runId}/approve`, { companyId }),
    processRun: (runId: string, companyId: string = 'demo-company') => apiClient.post(`/api/payroll/runs/${runId}/process`, { companyId }),
  },
  
  // Banking endpoints
  banking: {
    getAccounts: (companyId: string = 'demo-company') => apiClient.get(`/api/banking/accounts?companyId=${companyId}`),
    getBalances: (companyId: string = 'demo-company') => apiClient.get(`/api/banking/balances?companyId=${companyId}`),
    getTransactions: (companyId: string = 'demo-company') => apiClient.get(`/api/banking/transactions?companyId=${companyId}`),
    getStatus: (companyId: string = 'demo-company') => apiClient.get(`/api/banking/status?companyId=${companyId}`),
    refresh: (companyId: string = 'demo-company') => apiClient.post('/api/banking/refresh', { companyId }),
    linkToken: (userId: string = 'demo-user', companyId: string = 'demo-company') => apiClient.post('/api/banking/link-token', { userId, companyId }),
    exchangeToken: (publicToken: string, companyId: string = 'demo-company') => apiClient.post('/api/banking/exchange-token', { publicToken, companyId }),
  },
  
  // Monitoring endpoints
  monitoring: {
    getHealth: () => apiClient.get('/api/monitoring/health'),
    getMetrics: () => apiClient.get('/api/monitoring/metrics'),
    getJobs: () => apiClient.get('/api/monitoring/jobs'),
    getAlerts: () => apiClient.get('/api/monitoring/alerts'),
  },
  
  // Jobs endpoints
  jobs: {
    getAll: () => apiClient.get('/api/jobs'),
    getStats: () => apiClient.get('/api/jobs/stats'),
    startAll: () => apiClient.post('/api/jobs/start-all'),
    stopAll: () => apiClient.post('/api/jobs/stop-all'),
    triggerJob: (jobId: string) => apiClient.post(`/api/jobs/${jobId}/trigger`),
  },
  
  // Mock data endpoints
  mockData: {
    generate: (companyId: string = 'demo-company') => apiClient.post('/api/mock-data/generate', { companyId }),
    getStatus: (companyId: string = 'demo-company') => apiClient.get(`/api/mock-data/status?companyId=${companyId}`),
    clear: (companyId: string = 'demo-company') => apiClient.delete('/api/mock-data/clear', { data: { companyId } }),
  },
}
