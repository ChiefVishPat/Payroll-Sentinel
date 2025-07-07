/**
 * Risk Calculation Utilities
 * 
 * Provides functions for calculating cash flow risk, required floats,
 * and generating projections for payroll sentinel operations.
 */

export type RiskLevel = 'safe' | 'warning' | 'critical';

export interface CashFlowProjection {
  date: string;
  expectedInflow: number;
  expectedOutflow: number;
  netFlow: number;
  runningBalance: number;
  riskLevel: RiskLevel;
  description?: string;
}

export interface RiskAssessment {
  companyId: string;
  currentBalance: number;
  requiredFloat: number;
  riskLevel: RiskLevel;
  daysUntilRisk: number;
  recommendations: string[];
  projections: CashFlowProjection[];
  assessmentDate: string;
  nextPayrollDate?: string;
  nextPayrollAmount?: number;
}

export interface PayrollObligation {
  amount: number;
  date: string;
  description?: string;
  employeeCount?: number;
}

export interface CashInflow {
  amount: number;
  date: string;
  description?: string;
  confidence?: 'low' | 'medium' | 'high';
}

/**
 * Calculate required cash float based on payroll amount
 * @param payrollAmount - Total payroll amount
 * @param safetyMultiplier - Safety margin multiplier (default 1.1 = 10% buffer)
 * @returns Required float amount
 */
export function calculateRequiredFloat(
  payrollAmount: number,
  safetyMultiplier: number = 1.1
): number {
  if (payrollAmount < 0) {
    throw new Error('Payroll amount cannot be negative');
  }
  return Math.round(payrollAmount * safetyMultiplier * 100) / 100; // Round to 2 decimal places
}

/**
 * Determine risk level based on current balance and requirements
 * @param currentBalance - Current account balance
 * @param requiredFloat - Required cash float
 * @returns Risk level assessment
 */
export function determineRiskLevel(
  currentBalance: number,
  requiredFloat: number
): RiskLevel {
  // If no requirement, any balance is safe
  if (requiredFloat === 0) {
    return 'safe';
  }
  
  if (currentBalance >= requiredFloat) {
    return 'safe';
  } else if (currentBalance >= requiredFloat * 0.8) {
    return 'warning';
  } else {
    return 'critical';
  }
}

/**
 * Calculate days until a specific date
 * @param targetDate - Target date (ISO string)
 * @returns Number of days until target date
 */
export function calculateDaysUntil(targetDate: string): number {
  const today = new Date();
  const target = new Date(targetDate);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Generate cash flow projections for upcoming periods
 * @param currentBalance - Current account balance
 * @param payrollObligations - Array of upcoming payroll obligations
 * @param expectedInflows - Expected incoming cash flows
 * @returns Array of cash flow projections
 */
export function generateCashFlowProjections(
  currentBalance: number,
  payrollObligations: PayrollObligation[],
  expectedInflows: CashInflow[] = []
): CashFlowProjection[] {
  const projections: CashFlowProjection[] = [];
  let runningBalance = currentBalance;

  // Combine and sort all cash flow events
  const allEvents = [
    ...payrollObligations.map(p => ({ 
      ...p, 
      type: 'outflow' as const,
      description: p.description || `Payroll - ${p.employeeCount || 'N/A'} employees`
    })),
    ...expectedInflows.map(i => ({ 
      ...i, 
      type: 'inflow' as const,
      description: i.description || 'Expected income'
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  allEvents.forEach(event => {
    const inflow = event.type === 'inflow' ? event.amount : 0;
    const outflow = event.type === 'outflow' ? event.amount : 0;
    const netFlow = inflow - outflow;
    
    runningBalance += netFlow;
    
    const requiredFloat = event.type === 'outflow' 
      ? calculateRequiredFloat(event.amount)
      : 0;
    
    projections.push({
      date: event.date,
      expectedInflow: inflow,
      expectedOutflow: outflow,
      netFlow,
      runningBalance,
      riskLevel: determineRiskLevel(runningBalance, requiredFloat),
      description: event.description,
    });
  });

  return projections;
}

/**
 * Perform comprehensive risk assessment
 * @param companyId - Company identifier
 * @param currentBalance - Current account balance
 * @param payrollObligations - Upcoming payroll obligations
 * @param expectedInflows - Expected cash inflows
 * @returns Complete risk assessment
 */
export function performRiskAssessment(
  companyId: string,
  currentBalance: number,
  payrollObligations: PayrollObligation[],
  expectedInflows: CashInflow[] = []
): RiskAssessment {
  const nextPayroll = payrollObligations.length > 0 ? payrollObligations[0] : null;
  const requiredFloat = nextPayroll ? calculateRequiredFloat(nextPayroll.amount) : 0;
  const riskLevel = determineRiskLevel(currentBalance, requiredFloat);
  const daysUntilRisk = nextPayroll ? calculateDaysUntil(nextPayroll.date) : 0;
  
  const projections = generateCashFlowProjections(
    currentBalance,
    payrollObligations,
    expectedInflows
  );

  const recommendations: string[] = [];
  
  if (riskLevel === 'critical') {
    recommendations.push('🚨 IMMEDIATE ACTION REQUIRED: Insufficient funds for upcoming payroll');
    recommendations.push('💳 Consider emergency credit line or business loan');
    recommendations.push('⏸️ Delay non-essential payments until after cash flow improves');
    recommendations.push('📞 Contact banking partner for expedited credit options');
  } else if (riskLevel === 'warning') {
    recommendations.push('⚠️ Monitor cash flow closely over the next few days');
    recommendations.push('🔄 Prepare backup funding options (credit line, etc.)');
    recommendations.push('📈 Consider accelerating receivables collection');
    recommendations.push('📋 Review and postpone non-critical expenses');
  } else {
    recommendations.push('✅ Cash flow is currently healthy');
    recommendations.push('📊 Continue monitoring for any changes');
  }

  // Check for future risks in projections
  const futureRisks = projections.filter(p => p.riskLevel !== 'safe');
  if (futureRisks.length > 0) {
    recommendations.push(`⚡ ${futureRisks.length} potential future cash flow issues detected`);
    
    const criticalRisks = futureRisks.filter(p => p.riskLevel === 'critical');
    if (criticalRisks.length > 0) {
      recommendations.push(`🔴 ${criticalRisks.length} CRITICAL cash flow issues in projections`);
    }
  }

  const result: RiskAssessment = {
    companyId,
    currentBalance,
    requiredFloat,
    riskLevel,
    daysUntilRisk,
    recommendations,
    projections,
    assessmentDate: new Date().toISOString(),
    ...(nextPayroll?.date && { nextPayrollDate: nextPayroll.date }),
    ...(nextPayroll?.amount && { nextPayrollAmount: nextPayroll.amount }),
  };
  return result;
}

/**
 * Calculate risk score (0-100, where 100 is highest risk)
 * @param assessment - Risk assessment object
 * @returns Risk score from 0-100
 */
export function calculateRiskScore(assessment: RiskAssessment): number {
  let score = 0;

  // Base score from risk level
  switch (assessment.riskLevel) {
    case 'critical':
      score += 70;
      break;
    case 'warning':
      score += 40;
      break;
    case 'safe':
      score += 10;
      break;
  }

  // Adjust based on days until risk
  if (assessment.daysUntilRisk <= 1) {
    score += 20;
  } else if (assessment.daysUntilRisk <= 3) {
    score += 10;
  } else if (assessment.daysUntilRisk <= 7) {
    score += 5;
  }

  // Adjust based on future risks
  const futureRisks = assessment.projections.filter(p => p.riskLevel !== 'safe');
  score += Math.min(futureRisks.length * 2, 10); // Cap at 10 points

  return Math.min(score, 100); // Cap at 100
}

/**
 * Generate human-readable risk summary
 * @param assessment - Risk assessment object
 * @returns Human-readable summary string
 */
export function generateRiskSummary(assessment: RiskAssessment): string {
  const balance = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(assessment.currentBalance);

  if (assessment.riskLevel === 'critical') {
    return `🚨 CRITICAL: Current balance ${balance} is insufficient for upcoming payroll. Immediate action required.`;
  } else if (assessment.riskLevel === 'warning') {
    return `⚠️ WARNING: Current balance ${balance} is approaching minimum requirements. Monitor closely.`;
  } else {
    return `✅ HEALTHY: Current balance ${balance} meets payroll requirements. Continue monitoring.`;
  }
}

/**
 * Format currency for display
 * @param amount - Amount to format
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Get risk level color for UI display
 * @param riskLevel - Risk level
 * @returns Color code for UI
 */
export function getRiskLevelColor(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case 'critical':
      return '#FF4444'; // Red
    case 'warning':
      return '#FFA500'; // Orange
    case 'safe':
      return '#00AA00'; // Green
    default:
      return '#808080'; // Gray
  }
}

/**
 * Get risk level emoji for notifications
 * @param riskLevel - Risk level
 * @returns Emoji representation
 */
export function getRiskLevelEmoji(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case 'critical':
      return '🚨';
    case 'warning':
      return '⚠️';
    case 'safe':
      return '✅';
    default:
      return '❓';
  }
}
