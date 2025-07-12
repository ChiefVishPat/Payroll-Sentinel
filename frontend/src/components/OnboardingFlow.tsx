'use client';

import React, { useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import axios from 'axios';
import { Company, PaySchedule, AccountBalance } from '@frontend/shared/types';

// Set up axios default config
axios.defaults.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Steps for the onboarding flow
const STEPS = [
  'Company',
  'Bank Account',
  'Pay Schedule',
  'Run Payroll'
];

interface OnboardingFlowProps {
  onComplete?: () => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [company, setCompany] = useState<Partial<Company>>({});
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [itemId, setItemId] = useState<string | null>(null);
  const [payScheduleId, setPayScheduleId] = useState<string | null>(null);
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Company Creation
  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      console.log('➜ POST /api/companies →', company);
      const response = await axios.post('/api/companies', company);
      console.log('✓ Company created:', response.data);
      
      setCompanyId(response.data.check_company_id);
      setCurrentStep(1);
    } catch (err: any) {
      console.error('✗ Company creation failed:', err);
      setError(err.response?.data?.error || 'Failed to create company');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Bank Account Linking
  const getLinkToken = async () => {
    if (!companyId) return;

    setIsLoading(true);
    try {
      console.log('➜ POST /api/banking/link-token →', { companyId });
      const response = await axios.post('/api/banking/link-token', { 
        userId: 'demo-user', 
        companyId 
      });
      console.log('✓ Link token created:', response.data);
      setLinkToken(response.data.linkToken);
    } catch (err: any) {
      console.error('✗ Link token creation failed:', err);
      setError(err.response?.data?.error || 'Failed to create link token');
    } finally {
      setIsLoading(false);
    }
  };

  const onPlaidSuccess = async (public_token: string, metadata: any) => {
    console.log('[PlaidLink] public_token', public_token);
    setIsLoading(true);
    
    try {
      console.log('➜ POST /api/banking/exchange →', { publicToken: public_token, companyId });
      const response = await axios.post('/api/banking/exchange', {
        publicToken: public_token,
        companyId
      });
      console.log('✓ Token exchange successful:', response.data);
      
      setAccessToken(response.data.accessToken);
      setItemId(response.data.itemId);
      setCurrentStep(2);
    } catch (err: any) {
      console.error('✗ Token exchange failed:', err);
      setError(err.response?.data?.error || 'Failed to exchange token');
    } finally {
      setIsLoading(false);
    }
  };

  const { open: openPlaid, ready: plaidReady } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: (err, metadata) => {
      if (err) {
        console.error('[PlaidLink] exit error:', err);
        setError('Bank account linking cancelled');
      }
    },
  });

  // Step 3: Pay Schedule Creation
  const handlePayScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      console.log('➜ POST /api/pay-schedule →', { companyId, frequency: 'biweekly', firstPayday: '2024-01-15' });
      const response = await axios.post('/api/pay-schedule', {
        companyId,
        frequency: 'biweekly',
        firstPayday: '2024-01-15'
      });
      console.log('✓ Pay schedule created:', response.data);
      
      setPayScheduleId(response.data.payScheduleId);
      setCurrentStep(3);
    } catch (err: any) {
      console.error('✗ Pay schedule creation failed:', err);
      setError(err.response?.data?.error || 'Failed to create pay schedule');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 4: Run Payroll
  const handleRunPayroll = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('➜ POST /api/payroll/run →', { companyId, payScheduleId });
      const response = await axios.post('/api/payroll/run', {
        companyId,
        payScheduleId
      });
      console.log('✓ Payroll run successful:', response.data);
      
      // Refresh balances after payroll
      await fetchBalances();
      
      if (onComplete) onComplete();
    } catch (err: any) {
      console.error('✗ Payroll run failed:', err);
      setError(err.response?.data?.error || 'Failed to run payroll');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch current balances
  const fetchBalances = async () => {
    if (!itemId) return;

    try {
      console.log('➜ GET /api/banking/balances →', { itemId });
      const response = await axios.get(`/api/banking/balances?itemId=${itemId}`);
      console.log('✓ Balances fetched:', response.data);
      setBalances(response.data.balances);
    } catch (err: any) {
      console.error('✗ Balance fetch failed:', err);
    }
  };

  // Simulate deposit
  const simulateDeposit = async () => {
    if (!accessToken) return;

    setIsLoading(true);
    try {
      console.log('➜ POST /api/banking/simulate →', { accessToken, amount: 5000 });
      const response = await axios.post('/api/banking/simulate', {
        accessToken,
        amount: 5000,
        date: new Date().toISOString().split('T')[0],
        name: 'Simulated Deposit'
      });
      console.log('✓ Deposit simulation successful:', response.data);
      
      // Refresh balances
      await fetchBalances();
    } catch (err: any) {
      console.error('✗ Deposit simulation failed:', err);
      setError(err.response?.data?.error || 'Failed to simulate deposit');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Payroll Sentinel Demo</h1>
      
      {/* Step Indicator */}
      <div className="flex justify-between mb-8">
        {STEPS.map((step, index) => (
          <div
            key={step}
            className={`flex items-center ${
              index <= currentStep ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mr-2 ${
                index <= currentStep
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-gray-300'
              }`}
            >
              {index + 1}
            </div>
            <span className="font-medium">{step}</span>
          </div>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        {currentStep === 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Step 1: Create Company</h2>
            <form onSubmit={handleCompanySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Company Name</label>
                <input
                  type="text"
                  value={company.name || ''}
                  onChange={(e) => setCompany({ ...company, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">EIN</label>
                <input
                  type="text"
                  value={company.ein || ''}
                  onChange={(e) => setCompany({ ...company, ein: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="12-3456789"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">State</label>
                <input
                  type="text"
                  value={company.state || ''}
                  onChange={(e) => setCompany({ ...company, state: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="CA"
                  maxLength={2}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Company'}
              </button>
            </form>
          </div>
        )}

        {currentStep === 1 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Step 2: Link Bank Account</h2>
            <p className="text-gray-600 mb-4">
              Connect your bank account using Plaid. Use the test credentials:
              <br />
              <strong>Username:</strong> user_good
              <br />
              <strong>Password:</strong> pass_good
            </p>
            {!linkToken && (
              <button
                onClick={getLinkToken}
                disabled={isLoading}
                className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? 'Preparing...' : 'Get Link Token'}
              </button>
            )}
            {linkToken && (
              <button
                onClick={() => openPlaid()}
                disabled={!plaidReady || isLoading}
                className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? 'Connecting...' : 'Connect Bank Account'}
              </button>
            )}
          </div>
        )}

        {currentStep === 2 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Step 3: Create Pay Schedule</h2>
            <p className="text-gray-600 mb-4">
              Set up a biweekly payroll schedule for your company.
            </p>
            <form onSubmit={handlePayScheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Frequency</label>
                <select className="w-full p-2 border border-gray-300 rounded" disabled>
                  <option value="biweekly">Biweekly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">First Payday</label>
                <input
                  type="date"
                  value="2024-01-15"
                  className="w-full p-2 border border-gray-300 rounded"
                  disabled
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Pay Schedule'}
              </button>
            </form>
          </div>
        )}

        {currentStep === 3 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Step 4: Run Payroll</h2>
            <p className="text-gray-600 mb-4">
              Everything is set up! You can now run payroll and simulate deposits.
            </p>
            
            {/* Current Balances */}
            {balances.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Current Balances:</h3>
                {balances.map((balance, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded mb-2">
                    <p><strong>Account:</strong> {balance.accountId}</p>
                    <p><strong>Current:</strong> ${balance.current.toFixed(2)}</p>
                    <p><strong>Available:</strong> ${balance.available?.toFixed(2) || 'N/A'}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={simulateDeposit}
                disabled={isLoading}
                className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? 'Simulating...' : 'Simulate Deposit $5,000'}
              </button>
              
              <button
                onClick={handleRunPayroll}
                disabled={isLoading}
                className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? 'Running...' : 'Run Payroll'}
              </button>
              
              <button
                onClick={fetchBalances}
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Refreshing...' : 'Refresh Balances'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
