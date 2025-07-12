'use client'

import { useState } from 'react'
import { Button } from '@frontend/components/ui/button'
import { useCompany } from '@frontend/context/CompanyContext'

/**
 * Prompt for a company ID when none is selected.
 */
export default function CompanySelector() {
  const { setCompanyId } = useCompany()
  const [id, setId] = useState('')

  return (
    <div className="flex flex-col items-center gap-2 p-6">
      <input
        className="p-2 rounded border bg-gray-800 border-gray-700"
        placeholder="Enter company ID"
        value={id}
        onChange={e => setId(e.target.value)}
      />
      <Button onClick={() => id && setCompanyId(id)}>Select Company</Button>
    </div>
  )
}

