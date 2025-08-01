'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import StartupForm from '@frontend/components/StartupForm'
import PlaidLinkComponent from '@frontend/components/PlaidLinkComponent'
import { useCompany } from '@frontend/context/CompanyContext'

export default function OnboardingPage() {
  const [companyId, setCompanyIdLocal] = useState<string | null>(null)
  const { setCompanyId } = useCompany()
  const router = useRouter()

  return (
    <div className="dark:bg-gray-900 text-gray-100 min-h-screen flex items-center justify-center p-6">
      {!companyId ? (
        <StartupForm
          onSuccess={(id) => {
            setCompanyIdLocal(id)
            setCompanyId(id)
          }}
        />
      ) : (
        <PlaidLinkComponent
          companyId={companyId}
          onSuccess={() => router.push('/')}
        />
      )}
    </div>
  )
}
