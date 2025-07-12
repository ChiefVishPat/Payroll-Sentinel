'use client'

import { useState, FormEvent } from 'react'
import axios from 'axios'

interface StartupFormProps {
  onSuccess: (companyId: string) => void
}

/**
 * Collects basic company details and creates a new company
 * record via the backend API.
 */
export default function StartupForm({ onSuccess }: StartupFormProps) {
  const [name, setName] = useState('')
  const [ein, setEin] = useState('')
  const [state, setState] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await axios.post('/api/companies', { name, ein, state })
      const companyId = res.data.id || res.data.companyId || res.data.check_company_id
      console.debug('[Onboard] companyId', companyId)
      onSuccess(companyId)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create company')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
      <div>
        <label className="block text-sm mb-1">Company Name</label>
        <input
          className="w-full p-2 rounded bg-gray-800 border border-gray-700"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-sm mb-1">EIN</label>
        <input
          className="w-full p-2 rounded bg-gray-800 border border-gray-700"
          value={ein}
          onChange={e => setEin(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-sm mb-1">State</label>
        <input
          className="w-full p-2 rounded bg-gray-800 border border-gray-700"
          value={state}
          onChange={e => setState(e.target.value)}
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded"
      >
        {loading ? 'Creating…' : 'Create Startup'}
      </button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </form>
  )
}
