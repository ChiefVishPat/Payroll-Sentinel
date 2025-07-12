'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import StartupForm from '../../../components/StartupForm'
import PlaidLinkComponent from '../../../components/PlaidLinkComponent'

export default function OnboardingPage() {
  const [companyId, setCompanyId] = useState<string | null>(null)
  const router = useRouter()

  return (
    <div className="dark:bg-gray-900 text-gray-100 min-h-screen flex items-center justify-center p-6">
      {!companyId ? (
        <StartupForm onSuccess={setCompanyId} />
      ) : (
        <PlaidLinkComponent companyId={companyId} onSuccess={() => router.push('/dashboard')} />
      )}
    </div>
  )
}
