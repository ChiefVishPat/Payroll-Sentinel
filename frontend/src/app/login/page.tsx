'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@frontend/lib/api'
import { useCompany } from '@frontend/context/CompanyContext'
import StartupForm from '@frontend/components/StartupForm'
import { Company } from '@frontend/shared/types'

/**
 * Login page for selecting an existing company or onboarding a new one.
 */
export default function LoginPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [createNew, setCreateNew] = useState(false)
  const { setCompanyId } = useCompany()
  const router = useRouter()

  useEffect(() => {
    if (!createNew) {
      api.companies
        .list()
        .then(res => setCompanies(res.data.companies))
        .catch(err => console.error('Failed to load companies', err))
        .finally(() => setLoading(false))
    }
  }, [createNew])

  const handleSelect = (id: string) => {
    setCompanyId(id)
    router.push('/')
  }

  if (createNew) {
    return (
      <div className="dark:bg-gray-900 text-gray-100 min-h-screen flex items-center justify-center p-6">
        <StartupForm onSuccess={handleSelect} />
      </div>
    )
  }

  return (
    <div className="dark:bg-gray-900 text-gray-100 min-h-screen flex items-center justify-center p-6">
      <div className="space-y-4 w-full max-w-sm">
        <h1 className="text-xl font-semibold text-center">Select Your Company</h1>
        {loading ? (
          <p className="text-center">Loading...</p>
        ) : (
          <ul className="space-y-2">
            {companies.map(c => (
              <li key={c.id}>
                <button
                  onClick={() => handleSelect(c.id)}
                  className="w-full p-2 bg-gray-800 hover:bg-gray-700 rounded"
                >
                  {c.name}
                </button>
              </li>
            ))}
            {companies.length === 0 && (
              <li className="text-center text-sm text-gray-400">No companies found</li>
            )}
          </ul>
        )}
        <button
          onClick={() => setCreateNew(true)}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded"
        >
          Create New Company
        </button>
      </div>
    </div>
  )
}
