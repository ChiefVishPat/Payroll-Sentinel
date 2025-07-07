import { describe, it, expect } from 'vitest';

// Risk calculation utilities (these would typically be in src/utils/risk.ts)
export type RiskLevel = 'safe' | 'warning' | 'critical';

export interface CashFlowProjection {
  date: string;
  expectedInflow: number;
  expectedOutflow: number;
  netFlow: number;
  runningBalance: number;
  riskLevel: RiskLevel;
}

export interface RiskAssessment {
  currentBalance: number;
  requiredFloat: number;
  riskLevel: RiskLevel;
  daysUntilRisk: number;
  recommendations: string[];
  projections: CashFlowProjection[];
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
 * Calculate days until next payroll date
 * @param payrollDate - Next payroll date (ISO string)
 * @returns Number of days until payroll
 */
export function calculateDaysUntilPayroll(payrollDate: string): number {
  const today = new Date();
  const payDate = new Date(payrollDate);
  const diffTime = payDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Generate cash flow projections
 * @param currentBalance - Current account balance
 * @param upcomingPayrolls - Array of upcoming payroll amounts and dates
 * @param expectedInflows - Expected incoming cash flows
 * @returns Array of cash flow projections
 */
export function generateCashFlowProjections(
  currentBalance: number,
  upcomingPayrolls: { amount: number; date: string }[],
  expectedInflows: { amount: number; date: string }[] = []
): CashFlowProjection[] {
  const projections: CashFlowProjection[] = [];
  let runningBalance = currentBalance;

  // Combine and sort all cash flow events
  const allEvents = [
    ...upcomingPayrolls.map(p => ({ ...p, type: 'outflow' as const })),
    ...expectedInflows.map(i => ({ ...i, type: 'inflow' as const })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  allEvents.forEach(event => {
    const inflow = event.type === 'inflow' ? event.amount : 0;
    const outflow = event.type === 'outflow' ? event.amount : 0;
    const netFlow = inflow - outflow;
    
    runningBalance += netFlow;
    
    const requiredFloat = event.type === 'outflow' 
      ? calculateRequiredFloat(event.amount)
      : calculateRequiredFloat(0);
    
    projections.push({
      date: event.date,
      expectedInflow: inflow,
      expectedOutflow: outflow,
      netFlow,
      runningBalance,
      riskLevel: determineRiskLevel(runningBalance, requiredFloat),
    });
  });

  return projections;
}

/**
 * Perform comprehensive risk assessment
 * @param currentBalance - Current account balance
 * @param upcomingPayrolls - Upcoming payroll obligations
 * @param expectedInflows - Expected cash inflows
 * @returns Complete risk assessment
 */
export function performRiskAssessment(
  currentBalance: number,
  upcomingPayrolls: { amount: number; date: string }[],
  expectedInflows: { amount: number; date: string }[] = []
): RiskAssessment {
  const nextPayroll = upcomingPayrolls.length > 0 ? upcomingPayrolls[0] : null;
  const requiredFloat = nextPayroll ? calculateRequiredFloat(nextPayroll.amount) : 0;
  const riskLevel = determineRiskLevel(currentBalance, requiredFloat);
  const daysUntilRisk = nextPayroll ? calculateDaysUntilPayroll(nextPayroll.date) : 0;
  
  const projections = generateCashFlowProjections(
    currentBalance,
    upcomingPayrolls,
    expectedInflows
  );

  const recommendations: string[] = [];
  
  if (riskLevel === 'critical') {
    recommendations.push('Immediate action required: Insufficient funds for payroll');
    recommendations.push('Consider emergency credit line or delay non-essential payments');
  } else if (riskLevel === 'warning') {
    recommendations.push('Monitor cash flow closely');
    recommendations.push('Prepare backup funding options');
  } else {
    recommendations.push('Cash flow is healthy');
  }

  // Check for future risks in projections
  const futureRisks = projections.filter(p => p.riskLevel !== 'safe');
  if (futureRisks.length > 0) {
    recommendations.push(`${futureRisks.length} potential future cash flow issues detected`);
  }

  return {
    currentBalance,
    requiredFloat,
    riskLevel,
    daysUntilRisk,
    recommendations,
    projections,
  };
}

describe('Risk Calculation Utilities', () => {
  describe('calculateRequiredFloat', () => {
    it('should calculate required float with default safety multiplier', () => {
      expect(calculateRequiredFloat(10000)).toBe(11000);
      expect(calculateRequiredFloat(50000)).toBe(55000);
      expect(calculateRequiredFloat(0)).toBe(0);
    });

    it('should calculate required float with custom safety multiplier', () => {
      expect(calculateRequiredFloat(10000, 1.2)).toBe(12000);
      expect(calculateRequiredFloat(10000, 1.0)).toBe(10000);
      expect(calculateRequiredFloat(10000, 1.5)).toBe(15000);
    });

    it('should round to 2 decimal places', () => {
      expect(calculateRequiredFloat(10000.123, 1.1)).toBe(11000.14);
      expect(calculateRequiredFloat(33333.33, 1.1)).toBe(36666.66);
    });

    it('should throw error for negative payroll amount', () => {
      expect(() => calculateRequiredFloat(-1000)).toThrow('Payroll amount cannot be negative');
    });

    it('should handle edge cases', () => {
      expect(calculateRequiredFloat(0.01)).toBe(0.01);
      expect(calculateRequiredFloat(1000000)).toBe(1100000);
    });
  });

  describe('determineRiskLevel', () => {
    it('should return safe when balance exceeds required float', () => {
      expect(determineRiskLevel(12000, 10000)).toBe('safe');
      expect(determineRiskLevel(10000, 10000)).toBe('safe');
      expect(determineRiskLevel(15000, 10000)).toBe('safe');
    });

    it('should return warning when balance is 80-100% of required float', () => {
      expect(determineRiskLevel(9000, 10000)).toBe('warning');
      expect(determineRiskLevel(8000, 10000)).toBe('warning');
      expect(determineRiskLevel(8500, 10000)).toBe('warning');
    });

    it('should return critical when balance is below 80% of required float', () => {
      expect(determineRiskLevel(7999, 10000)).toBe('critical');
      expect(determineRiskLevel(5000, 10000)).toBe('critical');
      expect(determineRiskLevel(0, 10000)).toBe('critical');
    });

    it('should handle zero required float', () => {
      expect(determineRiskLevel(1000, 0)).toBe('safe');
      expect(determineRiskLevel(0, 0)).toBe('safe');
    });

    it('should handle negative balances', () => {
      expect(determineRiskLevel(-1000, 10000)).toBe('critical');
      expect(determineRiskLevel(-5000, 0)).toBe('safe'); // No requirement
    });
  });

  describe('calculateDaysUntilPayroll', () => {
    it('should calculate days until future payroll date', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      expect(calculateDaysUntilPayroll(tomorrowStr)).toBe(1);
    });

    it('should calculate days for date one week from now', () => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split('T')[0];
      
      expect(calculateDaysUntilPayroll(nextWeekStr)).toBe(7);
    });

    it('should handle same day payroll', () => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      const result = calculateDaysUntilPayroll(todayStr);
      expect(Math.abs(result)).toBeLessThanOrEqual(1); // Could be 0 or 1 depending on time
    });

    it('should handle past dates with negative values', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      expect(calculateDaysUntilPayroll(yesterdayStr)).toBe(-1);
    });
  });

  describe('generateCashFlowProjections', () => {
    it('should generate projections for payroll outflows only', () => {
      const upcomingPayrolls = [
        { amount: 10000, date: '2024-01-15' },
        { amount: 12000, date: '2024-01-30' },
      ];

      const projections = generateCashFlowProjections(50000, upcomingPayrolls);

      expect(projections).toHaveLength(2);
      expect(projections[0]).toMatchObject({
        date: '2024-01-15',
        expectedInflow: 0,
        expectedOutflow: 10000,
        netFlow: -10000,
        runningBalance: 40000,
        riskLevel: 'safe', // 40000 > 11000 required float
      });
      expect(projections[1]).toMatchObject({
        date: '2024-01-30',
        expectedInflow: 0,
        expectedOutflow: 12000,
        netFlow: -12000,
        runningBalance: 28000,
        riskLevel: 'safe', // 28000 > 13200 required float
      });
    });

    it('should generate projections with both inflows and outflows', () => {
      const upcomingPayrolls = [{ amount: 15000, date: '2024-01-15' }];
      const expectedInflows = [{ amount: 20000, date: '2024-01-10' }];

      const projections = generateCashFlowProjections(10000, upcomingPayrolls, expectedInflows);

      expect(projections).toHaveLength(2);
      
      // First projection should be the inflow
      expect(projections[0]).toMatchObject({
        date: '2024-01-10',
        expectedInflow: 20000,
        expectedOutflow: 0,
        netFlow: 20000,
        runningBalance: 30000,
        riskLevel: 'safe',
      });
      
      // Second projection should be the outflow
      expect(projections[1]).toMatchObject({
        date: '2024-01-15',
        expectedInflow: 0,
        expectedOutflow: 15000,
        netFlow: -15000,
        runningBalance: 15000,
        riskLevel: 'warning', // 15000 < 16500 required float
      });
    });

    it('should sort events chronologically', () => {
      const upcomingPayrolls = [
        { amount: 10000, date: '2024-01-30' },
        { amount: 8000, date: '2024-01-15' },
      ];
      const expectedInflows = [{ amount: 5000, date: '2024-01-20' }];

      const projections = generateCashFlowProjections(20000, upcomingPayrolls, expectedInflows);

      expect(projections).toHaveLength(3);
      expect(projections[0].date).toBe('2024-01-15');
      expect(projections[1].date).toBe('2024-01-20');
      expect(projections[2].date).toBe('2024-01-30');
    });

    it('should identify risk levels in projections', () => {
      const upcomingPayrolls = [{ amount: 20000, date: '2024-01-15' }];

      const projections = generateCashFlowProjections(15000, upcomingPayrolls);

      expect(projections[0]).toMatchObject({
        runningBalance: -5000, // 15000 - 20000
        riskLevel: 'critical',
      });
    });
  });

  describe('performRiskAssessment', () => {
    it('should perform comprehensive risk assessment', () => {
      const upcomingPayrolls = [
        { amount: 10000, date: '2024-01-15' },
        { amount: 12000, date: '2024-01-30' },
      ];
      const expectedInflows = [{ amount: 15000, date: '2024-01-20' }];

      const assessment = performRiskAssessment(20000, upcomingPayrolls, expectedInflows);

      expect(assessment).toMatchObject({
        currentBalance: 20000,
        requiredFloat: 11000, // 10000 * 1.1
        riskLevel: 'safe',
        daysUntilRisk: expect.any(Number),
        recommendations: expect.arrayContaining(['Cash flow is healthy']),
        projections: expect.any(Array),
      });

      expect(assessment.projections).toHaveLength(3);
    });

    it('should provide critical risk assessment and recommendations', () => {
      const upcomingPayrolls = [{ amount: 20000, date: '2024-01-15' }];

      const assessment = performRiskAssessment(5000, upcomingPayrolls);

      expect(assessment).toMatchObject({
        currentBalance: 5000,
        requiredFloat: 22000,
        riskLevel: 'critical',
        recommendations: expect.arrayContaining([
          'Immediate action required: Insufficient funds for payroll',
          'Consider emergency credit line or delay non-essential payments',
        ]),
      });
    });

    it('should provide warning risk assessment and recommendations', () => {
      const upcomingPayrolls = [{ amount: 10000, date: '2024-01-15' }];

      const assessment = performRiskAssessment(9000, upcomingPayrolls);

      expect(assessment).toMatchObject({
        currentBalance: 9000,
        requiredFloat: 11000,
        riskLevel: 'warning',
        recommendations: expect.arrayContaining([
          'Monitor cash flow closely',
          'Prepare backup funding options',
        ]),
      });
    });

    it('should detect future risks in projections', () => {
      const upcomingPayrolls = [
        { amount: 5000, date: '2024-01-15' }, // Safe
        { amount: 20000, date: '2024-01-30' }, // Will cause risk
      ];

      const assessment = performRiskAssessment(20000, upcomingPayrolls);

      expect(assessment.riskLevel).toBe('safe'); // Current is safe
      expect(assessment.recommendations).toEqual(
        expect.arrayContaining([
          'Cash flow is healthy',
          expect.stringContaining('potential future cash flow issues detected'),
        ])
      );
    });

    it('should handle empty payroll schedule', () => {
      const assessment = performRiskAssessment(10000, []);

      expect(assessment).toMatchObject({
        currentBalance: 10000,
        requiredFloat: 0,
        riskLevel: 'safe',
        daysUntilRisk: 0,
        projections: [],
        recommendations: ['Cash flow is healthy'],
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very large numbers', () => {
      const largeAmount = 1000000000; // 1 billion
      const requiredFloat = calculateRequiredFloat(largeAmount);
      
      expect(requiredFloat).toBe(1100000000);
      expect(determineRiskLevel(1200000000, requiredFloat)).toBe('safe');
    });

    it('should handle very small numbers', () => {
      const smallAmount = 0.01;
      const requiredFloat = calculateRequiredFloat(smallAmount);
      
      expect(requiredFloat).toBe(0.01);
      expect(determineRiskLevel(0.02, requiredFloat)).toBe('safe');
    });

    it('should handle invalid dates gracefully', () => {
      expect(() => calculateDaysUntilPayroll('invalid-date')).not.toThrow();
      const result = calculateDaysUntilPayroll('invalid-date');
      expect(isNaN(result)).toBe(true);
    });

    it('should handle simultaneous cash flows on same date', () => {
      const upcomingPayrolls = [{ amount: 10000, date: '2024-01-15' }];
      const expectedInflows = [{ amount: 15000, date: '2024-01-15' }];

      const projections = generateCashFlowProjections(5000, upcomingPayrolls, expectedInflows);

      expect(projections).toHaveLength(2);
      // Should handle both events even on same date
      expect(projections.some(p => p.expectedInflow > 0)).toBe(true);
      expect(projections.some(p => p.expectedOutflow > 0)).toBe(true);
    });
  });
});
