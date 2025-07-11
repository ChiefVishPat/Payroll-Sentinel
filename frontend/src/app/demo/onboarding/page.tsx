'use client';

import React from 'react';
import OnboardingFlow from '../../../components/OnboardingFlow';

export default function OnboardingPage() {
  const handleComplete = () => {
    console.log('Onboarding completed successfully!');
    // You could redirect to dashboard or show success message
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <OnboardingFlow onComplete={handleComplete} />
    </div>
  );
}
