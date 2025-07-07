import { describe, it, expect } from 'vitest';
import { CreateCompanyInput } from '../../db/types';

// Additional types and validation utilities for testing
export interface BankAccount {
  id: string;
  companyId: string;
  accountName: string;
  accountNumber: string;
  routingNumber: string;
  plaidAccountId?: string;
  isActive: boolean;
  currentBalance?: number;
  lastSyncAt?: string;
}

export interface PayrollAlert {
  id: string;
  companyId: string;
  alertType: 'low_balance' | 'upcoming_payroll' | 'failed_payment';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  isResolved: boolean;
  createdAt: string;
  resolvedAt?: string;
}

// Validation functions
export function validateCompanyInput(input: unknown): input is CreateCompanyInput {
  if (!input || typeof input !== 'object') {
    return false;
  }
  
  const company = input as CreateCompanyInput;
  return typeof company.name === 'string' && company.name.trim().length > 0;
}

export function validateBankAccount(account: unknown): account is BankAccount {
  if (!account || typeof account !== 'object') {
    return false;
  }
  
  const bankAccount = account as BankAccount;
  
  return (
    typeof bankAccount.id === 'string' &&
    typeof bankAccount.companyId === 'string' &&
    typeof bankAccount.accountName === 'string' &&
    typeof bankAccount.accountNumber === 'string' &&
    typeof bankAccount.routingNumber === 'string' &&
    typeof bankAccount.isActive === 'boolean' &&
    bankAccount.accountName.trim().length > 0 &&
    bankAccount.accountNumber.length >= 4 &&
    bankAccount.routingNumber.length === 9 &&
    /^\d{9}$/.test(bankAccount.routingNumber) // Must be 9 digits
  );
}

export function validatePayrollAlert(alert: unknown): alert is PayrollAlert {
  if (!alert || typeof alert !== 'object') {
    return false;
  }
  
  const payrollAlert = alert as PayrollAlert;
  const validAlertTypes = ['low_balance', 'upcoming_payroll', 'failed_payment'];
  const validSeverities = ['info', 'warning', 'critical'];
  
  return (
    typeof payrollAlert.id === 'string' &&
    typeof payrollAlert.companyId === 'string' &&
    validAlertTypes.includes(payrollAlert.alertType) &&
    validSeverities.includes(payrollAlert.severity) &&
    typeof payrollAlert.message === 'string' &&
    typeof payrollAlert.isResolved === 'boolean' &&
    typeof payrollAlert.createdAt === 'string' &&
    payrollAlert.message.trim().length > 0
  );
}

// Utility functions for data transformation
export function sanitizeCompanyName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) {
    return '*'.repeat(accountNumber.length);
  }
  const lastFour = accountNumber.slice(-4);
  const masked = '*'.repeat(accountNumber.length - 4);
  return masked + lastFour;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function calculateAccountBalanceChange(
  previousBalance: number,
  currentBalance: number
): { amount: number; percentage: number } {
  const amount = currentBalance - previousBalance;
  const percentage = previousBalance !== 0 ? (amount / Math.abs(previousBalance)) * 100 : 0;
  
  return {
    amount: Math.round(amount * 100) / 100,
    percentage: Math.round(percentage * 100) / 100,
  };
}

describe('Database Types and Validation', () => {
  describe('CreateCompanyInput', () => {
    it('should validate correct company input', () => {
      const validInput: CreateCompanyInput = {
        name: 'Test Company Inc.',
      };

      expect(validateCompanyInput(validInput)).toBe(true);
      expect(validInput.name).toBe('Test Company Inc.');
    });

    it('should handle company name type checking', () => {
      const validCompany: CreateCompanyInput = {
        name: 'Valid Company Name',
      };

      expect(typeof validCompany.name).toBe('string');
      expect(validCompany.name.length).toBeGreaterThan(0);
    });

    it('should reject invalid company input', () => {
      const invalidInputs = [
        null,
        undefined,
        {},
        { name: '' },
        { name: 123 },
        { name: null },
        { wrongField: 'Test' },
      ];

      invalidInputs.forEach(input => {
        expect(validateCompanyInput(input)).toBe(false);
      });
    });

    it('should handle whitespace in company names', () => {
      const inputWithWhitespace = { name: '  Test Company  ' };
      expect(validateCompanyInput(inputWithWhitespace)).toBe(true);
      
      const sanitized = sanitizeCompanyName(inputWithWhitespace.name);
      expect(sanitized).toBe('Test Company');
    });
  });

  describe('BankAccount Validation', () => {
    const validBankAccount: BankAccount = {
      id: 'bank_123',
      companyId: 'comp_456',
      accountName: 'Primary Checking',
      accountNumber: '1234567890',
      routingNumber: '021000021',
      isActive: true,
      currentBalance: 50000.00,
      lastSyncAt: '2024-01-01T00:00:00Z',
    };

    it('should validate correct bank account', () => {
      expect(validateBankAccount(validBankAccount)).toBe(true);
    });

    it('should validate required fields', () => {
      const requiredFields = ['id', 'companyId', 'accountName', 'accountNumber', 'routingNumber', 'isActive'];
      
      requiredFields.forEach(field => {
        const incompleteAccount = { ...validBankAccount };
        delete incompleteAccount[field as keyof BankAccount];
        
        expect(validateBankAccount(incompleteAccount)).toBe(false);
      });
    });

    it('should validate account number length', () => {
      const shortAccountNumber = { ...validBankAccount, accountNumber: '123' };
      expect(validateBankAccount(shortAccountNumber)).toBe(false);

      const validShortAccount = { ...validBankAccount, accountNumber: '1234' };
      expect(validateBankAccount(validShortAccount)).toBe(true);
    });

    it('should validate routing number format', () => {
      const invalidRoutingNumbers = [
        '12345678',    // Too short
        '1234567890',  // Too long
        'abcdefghi',   // Non-numeric
      ];

      invalidRoutingNumbers.forEach(routingNumber => {
        const invalidAccount = { ...validBankAccount, routingNumber };
        expect(validateBankAccount(invalidAccount)).toBe(false);
      });
    });

    it('should handle optional fields', () => {
      const minimalAccount: BankAccount = {
        id: 'bank_123',
        companyId: 'comp_456',
        accountName: 'Primary Checking',
        accountNumber: '1234567890',
        routingNumber: '021000021',
        isActive: true,
      };

      expect(validateBankAccount(minimalAccount)).toBe(true);
    });

    it('should reject invalid types', () => {
      const invalidAccounts = [
        null,
        undefined,
        'string',
        123,
        [],
        { ...validBankAccount, isActive: 'true' }, // Wrong type
      ];

      invalidAccounts.forEach(account => {
        expect(validateBankAccount(account)).toBe(false);
      });
    });
  });

  describe('PayrollAlert Validation', () => {
    const validAlert: PayrollAlert = {
      id: 'alert_123',
      companyId: 'comp_456',
      alertType: 'low_balance',
      severity: 'warning',
      message: 'Account balance is below payroll requirements',
      isResolved: false,
      createdAt: '2024-01-01T00:00:00Z',
    };

    it('should validate correct payroll alert', () => {
      expect(validatePayrollAlert(validAlert)).toBe(true);
    });

    it('should validate alert types', () => {
      const validAlertTypes = ['low_balance', 'upcoming_payroll', 'failed_payment'];
      
      validAlertTypes.forEach(alertType => {
        const alert = { ...validAlert, alertType };
        expect(validatePayrollAlert(alert)).toBe(true);
      });

      const invalidAlert = { ...validAlert, alertType: 'invalid_type' };
      expect(validatePayrollAlert(invalidAlert)).toBe(false);
    });

    it('should validate severity levels', () => {
      const validSeverities = ['info', 'warning', 'critical'];
      
      validSeverities.forEach(severity => {
        const alert = { ...validAlert, severity };
        expect(validatePayrollAlert(alert)).toBe(true);
      });

      const invalidAlert = { ...validAlert, severity: 'urgent' };
      expect(validatePayrollAlert(invalidAlert)).toBe(false);
    });

    it('should require non-empty message', () => {
      const emptyMessageAlert = { ...validAlert, message: '' };
      expect(validatePayrollAlert(emptyMessageAlert)).toBe(false);

      const whitespaceMessageAlert = { ...validAlert, message: '   ' };
      expect(validatePayrollAlert(whitespaceMessageAlert)).toBe(false);
    });

    it('should handle optional resolvedAt field', () => {
      const resolvedAlert = {
        ...validAlert,
        isResolved: true,
        resolvedAt: '2024-01-02T00:00:00Z',
      };

      expect(validatePayrollAlert(resolvedAlert)).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    describe('sanitizeCompanyName', () => {
      it('should trim whitespace', () => {
        expect(sanitizeCompanyName('  Company Name  ')).toBe('Company Name');
      });

      it('should collapse multiple spaces', () => {
        expect(sanitizeCompanyName('Company    Name    Inc')).toBe('Company Name Inc');
      });

      it('should handle mixed whitespace', () => {
        expect(sanitizeCompanyName(' \t Company \n Name \r ')).toBe('Company Name');
      });

      it('should handle empty and whitespace-only strings', () => {
        expect(sanitizeCompanyName('')).toBe('');
        expect(sanitizeCompanyName('   ')).toBe('');
      });
    });

    describe('maskAccountNumber', () => {
      it('should mask long account numbers', () => {
        expect(maskAccountNumber('1234567890')).toBe('******7890');
        expect(maskAccountNumber('123456789012345')).toBe('***********2345');
      });

      it('should handle short account numbers', () => {
        expect(maskAccountNumber('1234')).toBe('****');
        expect(maskAccountNumber('123')).toBe('***');
        expect(maskAccountNumber('12')).toBe('**');
        expect(maskAccountNumber('1')).toBe('*');
      });

      it('should handle empty string', () => {
        expect(maskAccountNumber('')).toBe('');
      });
    });

    describe('formatCurrency', () => {
      it('should format positive amounts', () => {
        expect(formatCurrency(1000)).toBe('$1,000.00');
        expect(formatCurrency(1234.56)).toBe('$1,234.56');
        expect(formatCurrency(1000000)).toBe('$1,000,000.00');
      });

      it('should format negative amounts', () => {
        expect(formatCurrency(-1000)).toBe('-$1,000.00');
        expect(formatCurrency(-1234.56)).toBe('-$1,234.56');
      });

      it('should format zero and small amounts', () => {
        expect(formatCurrency(0)).toBe('$0.00');
        expect(formatCurrency(0.01)).toBe('$0.01');
        expect(formatCurrency(0.99)).toBe('$0.99');
      });

      it('should handle large numbers', () => {
        expect(formatCurrency(999999999.99)).toBe('$999,999,999.99');
      });
    });

    describe('calculateAccountBalanceChange', () => {
      it('should calculate positive balance changes', () => {
        const change = calculateAccountBalanceChange(10000, 12000);
        expect(change).toEqual({
          amount: 2000,
          percentage: 20,
        });
      });

      it('should calculate negative balance changes', () => {
        const change = calculateAccountBalanceChange(10000, 8000);
        expect(change).toEqual({
          amount: -2000,
          percentage: -20,
        });
      });

      it('should handle zero previous balance', () => {
        const change = calculateAccountBalanceChange(0, 5000);
        expect(change).toEqual({
          amount: 5000,
          percentage: 0, // Can't calculate percentage from zero
        });
      });

      it('should handle no change', () => {
        const change = calculateAccountBalanceChange(10000, 10000);
        expect(change).toEqual({
          amount: 0,
          percentage: 0,
        });
      });

      it('should handle negative previous balance', () => {
        const change = calculateAccountBalanceChange(-1000, 1000);
        expect(change).toEqual({
          amount: 2000,
          percentage: 200, // 2000 / 1000 * 100
        });
      });

      it('should round to 2 decimal places', () => {
        const change = calculateAccountBalanceChange(10000, 10333.333);
        expect(change).toEqual({
          amount: 333.33,
          percentage: 3.33,
        });
      });

      it('should handle very small changes', () => {
        const change = calculateAccountBalanceChange(10000.00, 10000.01);
        expect(change).toEqual({
          amount: 0.01,
          percentage: 0,
        });
      });
    });
  });

  describe('Type Safety and Integration', () => {
    it('should ensure type compatibility between related interfaces', () => {
      const company: CreateCompanyInput = { name: 'Test Company' };
      const account: BankAccount = {
        id: 'bank_123',
        companyId: 'comp_456', // This would reference a company
        accountName: 'Primary Account',
        accountNumber: '1234567890',
        routingNumber: '021000021',
        isActive: true,
      };
      const alert: PayrollAlert = {
        id: 'alert_123',
        companyId: 'comp_456', // Same company reference
        alertType: 'low_balance',
        severity: 'warning',
        message: 'Test alert',
        isResolved: false,
        createdAt: new Date().toISOString(),
      };

      // All should have compatible company references
      expect(account.companyId).toBe(alert.companyId);
      expect(company.name).toBeDefined();
      expect(validateCompanyInput(company)).toBe(true);
      expect(validateBankAccount(account)).toBe(true);
      expect(validatePayrollAlert(alert)).toBe(true);
    });

    it('should maintain data consistency across operations', () => {
      const originalBalance = 15000;
      const newBalance = 12000;
      const accountNumber = '1234567890123';

      // Operations should be consistent
      const maskedNumber = maskAccountNumber(accountNumber);
      const balanceChange = calculateAccountBalanceChange(originalBalance, newBalance);
      const formattedAmount = formatCurrency(balanceChange.amount);

      expect(maskedNumber).toBe('*********0123');
      expect(balanceChange.amount).toBe(-3000);
      expect(formattedAmount).toBe('-$3,000.00');
    });
  });

  describe('Error Edge Cases', () => {
    it('should handle malformed data gracefully', () => {
      const malformedData = [
        { name: null },
        { accountNumber: undefined },
        { severity: 123 },
        { isActive: 'maybe' },
        { currentBalance: 'a lot' },
      ];

      malformedData.forEach(data => {
        expect(validateCompanyInput(data)).toBe(false);
        expect(validateBankAccount(data)).toBe(false);
        expect(validatePayrollAlert(data)).toBe(false);
      });
    });

    it('should handle extreme values', () => {
      const extremeValues = {
        veryLongString: 'a'.repeat(10000),
        veryLargeNumber: Number.MAX_SAFE_INTEGER,
        verySmallNumber: Number.MIN_SAFE_INTEGER,
        emptyString: '',
      };

      // Should handle large currency amounts
      expect(formatCurrency(extremeValues.veryLargeNumber)).toContain('$');
      expect(formatCurrency(extremeValues.verySmallNumber)).toContain('-$');

      // Should handle empty account numbers
      expect(maskAccountNumber(extremeValues.emptyString)).toBe('');

      // Should handle very long company names
      const longName = sanitizeCompanyName(extremeValues.veryLongString);
      expect(longName.length).toBe(extremeValues.veryLongString.length);
    });
  });
});
