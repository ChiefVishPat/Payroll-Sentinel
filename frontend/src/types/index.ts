export interface RiskAssessment {
  id: string
  timestamp: string
  overallRisk: 'low' | 'medium' | 'high'
  score: number
  factors: RiskFactor[]
  recommendations: string[]
}

export interface RiskFactor {
  category: string
  score: number
  impact: 'low' | 'medium' | 'high'
  description: string
}

export interface RiskAlert {
  id: string
  type: 'cash_flow' | 'payroll' | 'banking' | 'compliance'
  level: 'low' | 'medium' | 'high'
  title: string
  description: string
  timestamp: string
  acknowledged: boolean
  resolved: boolean
}

export interface CashFlowSummary {
  currentBalance: number
  projectedBalance: number
  burnRate: number
  runway: number
  lastUpdated: string
}

export interface CashFlowProjection {
  date: string
  projected: number
  actual?: number
  inflow: number
  outflow: number
}

export interface PayrollRun {
  id: string
  payPeriod: string
  scheduledDate: string
  status: 'draft' | 'pending' | 'approved' | 'processed' | 'failed'
  totalAmount: number
  employeeCount: number
  entries: PayrollEntry[]
}

export interface PayrollEntry {
  id: string
  employeeId: string
  employeeName: string
  grossPay: number
  deductions: number
  netPay: number
  hoursWorked: number
}

export interface Employee {
  id: string
  name: string
  title: string
  salary: number
  status: 'active' | 'inactive'
  startDate?: string
  department?: string
}

export interface BankAccount {
  id: string
  name: string
  type: 'checking' | 'savings' | 'credit'
  balance: number
  availableBalance: number
  institutionName: string
  lastUpdated: string
}

export interface Transaction {
  id: string
  accountId: string
  amount: number
  description: string
  category: string
  date: string
  type: 'debit' | 'credit'
}

export interface JobStatus {
  id: string
  name: string
  status: 'running' | 'idle' | 'error'
  lastRun: string
  nextRun: string
  interval: number
  description: string
}

export interface SystemMetrics {
  uptime: number
  memoryUsage: number
  cpuUsage: number
  activeJobs: number
  totalRequests: number
  errorRate: number
}

export interface Alert {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  timestamp: string
  read: boolean
}

export interface DashboardStats {
  totalBalance: number
  monthlyBurnRate: number
  upcomingPayroll: number
  activeAlerts: number
  riskLevel: 'low' | 'medium' | 'high'
  lastUpdated: string
}
