/**
 * Risk Calculation Utilities
 * 
 * Comprehensive toolkit for analyzing cash flow risk and generating
 * actionable insights for payroll management. Provides risk scoring,
 * projection modeling, and automated recommendation generation.
 * 
 * @author Payroll Sentinel Team
 * @version 1.0.0
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Risk levels for cash flow analysis */
export type RiskLevel = 'safe' | 'warning' | 'critical';

/** Confidence levels for data quality assessment */
export type ConfidenceLevel = 'low' | 'medium' | 'high';

/**
 * Cash flow projection for a specific date
 */
export interface CashFlowProjection {
  /** ISO date string for the projection */
  date: string;
  /** Expected money coming in */
  expectedInflow: number;
  /** Expected money going out */
  expectedOutflow: number;
  /** Net change (inflow - outflow) */
  netFlow: number;
  /** Account balance after this transaction */
  runningBalance: number;
  /** Risk level at this point in time */
  riskLevel: RiskLevel;
  /** Human-readable description of the event */
  description?: string;
}

/**
 * Comprehensive risk assessment for a company
 */
export interface RiskAssessment {
  /** Company identifier */
  companyId: string;
  /** Current account balance */
  currentBalance: number;
  /** Required cash float for safety */
  requiredFloat: number;
  /** Overall risk level */
  riskLevel: RiskLevel;
  /** Days until next risk event */
  daysUntilRisk: number;
  /** Actionable recommendations */
  recommendations: string[];
  /** Future cash flow projections */
  projections: CashFlowProjection[];
  /** When this assessment was performed */
  assessmentDate: string;
  /** Next payroll date (if any) */
  nextPayrollDate?: string;
  /** Next payroll amount (if any) */
  nextPayrollAmount?: number;
}

/**
 * Upcoming payroll obligation
 */
export interface PayrollObligation {
  /** Payroll amount */
  amount: number;
  /** ISO date string for payroll date */
  date: string;
  /** Description of the payroll */
  description?: string;
  /** Number of employees in this payroll */
  employeeCount?: number;
}

/**
 * Expected cash inflow
 */
export interface CashInflow {
  /** Expected amount */
  amount: number;
  /** ISO date string for expected receipt */
  date: string;
  /** Description of the income source */
  description?: string;
  /** Confidence level in receiving this amount */
  confidence?: ConfidenceLevel;
}

// ============================================================================
// CORE CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculates required cash float with safety buffer
 * 
 * @param payrollAmount - Total payroll amount
 * @param safetyMultiplier - Safety margin (default 1.1 = 10% buffer)
 * @returns Required float amount rounded to 2 decimal places
 * @throws Error if payrollAmount is negative
 */
export function calculateRequiredFloat(
  payrollAmount: number,
  safetyMultiplier: number = 1.1
): number {
  if (payrollAmount < 0) {
    throw new Error('Payroll amount cannot be negative');
  }
  return Math.round(payrollAmount * safetyMultiplier * 100) / 100;
}

/**
 * Determines risk level based on balance vs requirements
 * 
 * @param currentBalance - Current account balance
 * @param requiredFloat - Required cash float
 * @returns Risk level (safe: >=100%, warning: 80-99%, critical: <80%)
 */
export function determineRiskLevel(
  currentBalance: number,
  requiredFloat: number
): RiskLevel {
  if (requiredFloat === 0) return 'safe';
  
  const coverage = currentBalance / requiredFloat;
  
  if (coverage >= 1.0) return 'safe';
  if (coverage >= 0.8) return 'warning';
  return 'critical';
}

/**
 * Calculates days until target date
 * 
 * @param targetDate - Target date (ISO string)
 * @returns Number of days until target (positive for future, negative for past)
 */
export function calculateDaysUntil(targetDate: string): number {
  const today = new Date();
  const target = new Date(targetDate);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ============================================================================
// PROJECTION AND MODELING FUNCTIONS
// ============================================================================

/**
 * Generates cash flow projections for future periods
 * 
 * Combines payroll obligations and expected inflows to create
 * a timeline of account balance changes and associated risks.
 * 
 * @param currentBalance - Starting account balance
 * @param payrollObligations - Upcoming payroll obligations
 * @param expectedInflows - Expected cash inflows
 * @returns Chronologically sorted array of cash flow projections
 */
export function generateCashFlowProjections(
  currentBalance: number,
  payrollObligations: PayrollObligation[],
  expectedInflows: CashInflow[] = []
): CashFlowProjection[] {
  const projections: CashFlowProjection[] = [];
  let runningBalance = currentBalance;

  // Combine and sort all cash flow events chronologically
  const events = createCashFlowEvents(payrollObligations, expectedInflows);

  events.forEach(event => {
    const { inflow, outflow, netFlow } = calculateEventFlow(event);
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
 * Creates unified cash flow events from obligations and inflows
 */
function createCashFlowEvents(
  payrollObligations: PayrollObligation[],
  expectedInflows: CashInflow[]
) {
  const outflows = payrollObligations.map(p => ({
    ...p,
    type: 'outflow' as const,
    description: p.description || `Payroll - ${p.employeeCount || 'N/A'} employees`
  }));

  const inflows = expectedInflows.map(i => ({
    ...i,
    type: 'inflow' as const,
    description: i.description || 'Expected income'
  }));

  return [...outflows, ...inflows]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Calculates inflow, outflow, and net flow for an event
 */
function calculateEventFlow(event: { type: 'inflow' | 'outflow'; amount: number }) {
  const inflow = event.type === 'inflow' ? event.amount : 0;
  const outflow = event.type === 'outflow' ? event.amount : 0;
  const netFlow = inflow - outflow;
  
  return { inflow, outflow, netFlow };
}

/**
 * Performs comprehensive risk assessment for a company
 * 
 * Analyzes current balance against upcoming obligations to determine
 * risk level and generate actionable recommendations.
 * 
 * @param companyId - Company identifier
 * @param currentBalance - Current account balance
 * @param payrollObligations - Upcoming payroll obligations
 * @param expectedInflows - Expected cash inflows
 * @returns Complete risk assessment with projections and recommendations
 */
export function performRiskAssessment(
  companyId: string,
  currentBalance: number,
  payrollObligations: PayrollObligation[],
  expectedInflows: CashInflow[] = []
): RiskAssessment {
  // Analyze immediate risk from next payroll
  const nextPayroll = payrollObligations[0] || null;
  const requiredFloat = nextPayroll ? calculateRequiredFloat(nextPayroll.amount) : 0;
  const riskLevel = determineRiskLevel(currentBalance, requiredFloat);
  const daysUntilRisk = nextPayroll ? calculateDaysUntil(nextPayroll.date) : 0;
  
  // Generate future projections
  const projections = generateCashFlowProjections(
    currentBalance,
    payrollObligations,
    expectedInflows
  );

  // Generate risk-appropriate recommendations
  const recommendations = generateRecommendations(riskLevel, projections);

  return {
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
}

/**
 * Generates contextual recommendations based on risk level and projections
 */
function generateRecommendations(
  riskLevel: RiskLevel,
  projections: CashFlowProjection[]
): string[] {
  const recommendations: string[] = [];
  
  // Risk-level specific recommendations
  switch (riskLevel) {
    case 'critical':
      recommendations.push(
        '🚨 IMMEDIATE ACTION REQUIRED: Insufficient funds for upcoming payroll',
        '💳 Consider emergency credit line or business loan',
        '⏸️ Delay non-essential payments until after cash flow improves',
        '📞 Contact banking partner for expedited credit options'
      );
      break;
    case 'warning':
      recommendations.push(
        '⚠️ Monitor cash flow closely over the next few days',
        '🔄 Prepare backup funding options (credit line, etc.)',
        '📈 Consider accelerating receivables collection',
        '📋 Review and postpone non-critical expenses'
      );
      break;
    case 'safe':
      recommendations.push(
        '✅ Cash flow is currently healthy',
        '📊 Continue monitoring for any changes'
      );
      break;
  }

  // Add future risk warnings
  const futureRisks = projections.filter(p => p.riskLevel !== 'safe');
  if (futureRisks.length > 0) {
    recommendations.push(`⚡ ${futureRisks.length} potential future cash flow issues detected`);
    
    const criticalRisks = futureRisks.filter(p => p.riskLevel === 'critical');
    if (criticalRisks.length > 0) {
      recommendations.push(`🔴 ${criticalRisks.length} CRITICAL cash flow issues in projections`);
    }
  }

  return recommendations;
}

// ============================================================================
// SCORING AND ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Calculates numerical risk score from 0-100 (higher = more risk)
 * 
 * Combines base risk level with timing and future risk factors
 * to provide a quantitative risk measure for comparison and trending.
 * 
 * @param assessment - Complete risk assessment
 * @returns Risk score from 0-100
 */
export function calculateRiskScore(assessment: RiskAssessment): number {
  let score = getRiskLevelBaseScore(assessment.riskLevel);
  
  // Add urgency points based on timing
  score += getUrgencyScore(assessment.daysUntilRisk);
  
  // Add points for future risks (capped to prevent score inflation)
  score += getFutureRiskScore(assessment.projections);

  return Math.min(score, 100); // Ensure maximum of 100
}

/**
 * Gets base score for risk level
 */
function getRiskLevelBaseScore(riskLevel: RiskLevel): number {
  const baseScores = {
    critical: 70,
    warning: 40,
    safe: 10,
  };
  return baseScores[riskLevel];
}

/**
 * Gets urgency score based on days until risk
 */
function getUrgencyScore(daysUntilRisk: number): number {
  if (daysUntilRisk <= 1) return 20;
  if (daysUntilRisk <= 3) return 10;
  if (daysUntilRisk <= 7) return 5;
  return 0;
}

/**
 * Gets score adjustment for future risks
 */
function getFutureRiskScore(projections: CashFlowProjection[]): number {
  const futureRisks = projections.filter(p => p.riskLevel !== 'safe');
  return Math.min(futureRisks.length * 2, 10); // Cap at 10 points
}

// ============================================================================
// FORMATTING AND DISPLAY UTILITIES
// ============================================================================

/**
 * Generates human-readable risk summary
 * 
 * @param assessment - Risk assessment to summarize
 * @returns Formatted summary string with emoji and context
 */
export function generateRiskSummary(assessment: RiskAssessment): string {
  const balance = formatCurrency(assessment.currentBalance);
  const emoji = getRiskLevelEmoji(assessment.riskLevel);

  const messages = {
    critical: `${emoji} CRITICAL: Current balance ${balance} is insufficient for upcoming payroll. Immediate action required.`,
    warning: `${emoji} WARNING: Current balance ${balance} is approaching minimum requirements. Monitor closely.`,
    safe: `${emoji} HEALTHY: Current balance ${balance} meets payroll requirements. Continue monitoring.`,
  };

  return messages[assessment.riskLevel];
}

/**
 * Formats numbers as currency
 * 
 * @param amount - Amount to format
 * @returns USD formatted currency string
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Gets color code for risk level (for UI components)
 * 
 * @param riskLevel - Risk level
 * @returns Hex color code
 */
export function getRiskLevelColor(riskLevel: RiskLevel): string {
  const colors = {
    critical: '#FF4444', // Red
    warning: '#FFA500',  // Orange
    safe: '#00AA00',     // Green
  };
  return colors[riskLevel] || '#808080'; // Gray fallback
}

/**
 * Gets emoji representation for risk level
 * 
 * @param riskLevel - Risk level
 * @returns Emoji string
 */
export function getRiskLevelEmoji(riskLevel: RiskLevel): string {
  const emojis = {
    critical: '🚨',
    warning: '⚠️',
    safe: '✅',
  };
  return emojis[riskLevel] || '❓';
}
