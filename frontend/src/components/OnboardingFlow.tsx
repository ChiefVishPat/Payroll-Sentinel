'use client';
import { useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { apiClient } from '../lib/api';

const steps = ['Company', 'Bank', 'Pay Schedule', 'Run Payroll'];

export default function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const [companyId, setCompanyId] = useState('');
  const [linkToken, setLinkToken] = useState('');
  const [scheduleId, setScheduleId] = useState('');

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken) => {
      await apiClient.post('/api/banking/exchange-token', { publicToken, companyId });
      setStep(2);
    },
  });

  const createCompany = async (name: string) => {
    const res = await apiClient.post('/api/companies', { name, ein: '00-0000000', state: 'CA' });
    setCompanyId(res.data.companyId);
    setStep(1);
  };

  const linkBank = async () => {
    const res = await apiClient.post('/api/banking/link-token', { companyId });
    setLinkToken(res.data.linkToken);
  };

  const createSchedule = async () => {
    const res = await apiClient.post('/api/pay-schedule', { companyId });
    setScheduleId(res.data.payScheduleId);
    setStep(3);
  };

  const runPayroll = async () => {
    await apiClient.post('/api/payroll/run', { companyId, payScheduleId: scheduleId });
  };

  return (
    <div>
      <p>Step: {steps[step]}</p>
      {step === 0 && (
        <button onClick={() => createCompany('Demo Co')}>Create Company</button>
      )}
      {step === 1 && (
        <div>
          {!linkToken && <button onClick={linkBank}>Get Link Token</button>}
          {linkToken && <button disabled={!ready} onClick={() => open()}>Connect to Bank</button>}
        </div>
      )}
      {step === 2 && <button onClick={createSchedule}>Create Pay Schedule</button>}
      {step === 3 && <button onClick={runPayroll}>Run Payroll</button>}
    </div>
  );
}
