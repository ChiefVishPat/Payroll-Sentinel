'use client'

import { useState } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { apiClient } from '../lib/api'

interface PlaidLinkProps {
  companyId: string
  onSuccess: () => void
}

/**
 * Handles Plaid Link flow for connecting a bank account.
 */
export default function PlaidLinkComponent({ companyId, onSuccess }: PlaidLinkProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchLinkToken = async () => {
    setLoading(true)
    try {
      const res = await apiClient.post('/api/banking/link-token', {
        userId: 'sandbox-user-123',
        companyId,
      })
      console.debug('[PlaidLink] link_token', res.data.linkToken)
      setLinkToken(res.data.linkToken)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to get link token')
    } finally {
      setLoading(false)
    }
  }

  const handleSuccess = async (public_token: string) => {
    try {
      await apiClient.post('/api/banking/exchange-token', {
        publicToken: public_token,
        companyId,
      })
      onSuccess()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Token exchange failed')
    }
  }

  const { open, ready } = usePlaidLink({ token: linkToken, onSuccess: handleSuccess })

  const startLink = async () => {
    if (!linkToken) {
      await fetchLinkToken()
    } else if (ready) {
      open()
    }
  }

  return (
    <div className="space-y-4 w-full max-w-sm">
      <button
        onClick={startLink}
        disabled={loading || (linkToken ? !ready : false)}
        className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded"
      >
        {loading ? 'Connecting…' : 'Connect Bank'}
      </button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  )
}
