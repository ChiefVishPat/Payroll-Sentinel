'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface CompanyContextValue {
  companyId: string | null
  setCompanyId: (id: string) => void
}

const CompanyContext = createContext<CompanyContextValue>({
  companyId: null,
  setCompanyId: () => {}
})

/**
 * Provides the currently selected company ID to child components.
 * The ID is persisted to localStorage so it survives page reloads.
 */
export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companyId, setCompanyIdState] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('companyId')
    if (stored) setCompanyIdState(stored)
  }, [])

  const setCompanyId = (id: string) => {
    localStorage.setItem('companyId', id)
    setCompanyIdState(id)
  }

  return (
    <CompanyContext.Provider value={{ companyId, setCompanyId }}>
      {children}
    </CompanyContext.Provider>
  )
}

/**
 * Hook to access the current company context.
 */
export function useCompany() {
  return useContext(CompanyContext)
}
