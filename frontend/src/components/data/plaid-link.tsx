'use client'

import { useState, useEffect } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { CreditCard, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react'

interface PlaidLinkProps {
  onSuccess: () => void
}

export default function PlaidLinkComponent({ onSuccess }: PlaidLinkProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [linkToken, setLinkToken] = useState<string | null>(null)

  useEffect(() => {
    getLinkToken()
  }, [])

  const getLinkToken = async () => {
    try {
      console.log('Requesting link_token…');
      const linkTokenResponse = await api.banking.linkToken('sandbox-user-123', 'demo-company')
      setLinkToken(linkTokenResponse.data.linkToken)
      console.debug('[PlaidLink] link token obtained:', linkTokenResponse.data.linkToken)
    } catch (error) {
      console.error('Failed to get link token:', error)
      setConnectionStatus('error')
      setMessage('Failed to get link token.')
    }
  }

  const onPlaidSuccess = async (public_token: string, metadata: any) => {
    console.log('Link success – received public_token', public_token);
    console.log('Exchanging public_token…');
    setMessage('Exchanging tokens...')
    setIsConnecting(true)
    
    try {
      await api.banking.exchangeToken(public_token, 'demo-company')
      console.log('access_token stored – fetching accounts next');
      setConnectionStatus('success')
      setMessage('Bank account connected successfully!')
      onSuccess()
    } catch (exchangeError) {
      console.error('[PlaidLink] exchangeToken error:', exchangeError)
      setConnectionStatus('error')
      setMessage('Failed to exchange token.')
    } finally {
      setIsConnecting(false)
    }
  }

  const onPlaidExit = (err: any, metadata: any) => {
    console.error('[PlaidLink] onExit error:', err, metadata)
    setConnectionStatus('error')
    const errorMsg = metadata?.error_message || err?.display_message || 'Failed to connect bank account.'
    setMessage(errorMsg)
    setIsConnecting(false)
  }

  const { open: openPlaid, ready: plaidReady } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: onPlaidExit,
  })

  const connectBankAccount = async () => {
    if (!linkToken) {
      console.error('No link token available')
      await getLinkToken()
      return
    }

    if (!plaidReady) {
      console.error('Plaid not ready')
      return
    }

    setIsConnecting(true)
    setConnectionStatus('idle')
    openPlaid()
  }

  const openPlaidDemo = () => {
    // Open Plaid's demo page
    window.open('https://plaid.com/docs/link/demo/', '_blank')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
        <CreditCard className="h-8 w-8 text-blue-600" />
        <div className="flex-1">
          <div className="font-medium">Connect Your Bank Account</div>
          <div className="text-sm text-gray-600">
            Securely connect your business bank accounts using Plaid
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded-lg">
          <div className="font-medium mb-2">Production Connection</div>
          <div className="text-sm text-gray-600 mb-3">
            Connect your real bank accounts for live data
          </div>
          <Button 
            onClick={connectBankAccount} 
            disabled={!plaidReady || isConnecting || !linkToken}
            className="w-full"
          >
            {isConnecting ? 'Connecting...' : 'Connect Bank Account'}
          </Button>
        </div>

        <div className="p-4 border rounded-lg">
          <div className="font-medium mb-2">Try Plaid Demo</div>
          <div className="text-sm text-gray-600 mb-3">
            Test the connection flow with Plaid's sandbox
          </div>
          <Button 
            variant="outline" 
            onClick={openPlaidDemo}
            className="w-full flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open Plaid Demo
          </Button>
        </div>
      </div>

      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-lg ${
          connectionStatus === 'success' ? 'bg-green-50 text-green-800' :
          connectionStatus === 'error' ? 'bg-red-50 text-red-800' :
          'bg-blue-50 text-blue-800'
        }`}>
          {connectionStatus === 'success' && <CheckCircle className="h-5 w-5" />}
          {connectionStatus === 'error' && <AlertCircle className="h-5 w-5" />}
          <span className="text-sm">{message}</span>
        </div>
      )}

      <div className="text-xs text-gray-500 space-y-1">
        <p><strong>Supported Banks:</strong> Chase, Bank of America, Wells Fargo, Citi, and 11,000+ others</p>
        <p><strong>Security:</strong> Bank-level encryption, read-only access, no stored credentials</p>
        <p><strong>Data:</strong> Account balances, transactions, account details</p>
      </div>

      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <strong>Demo Mode:</strong> This is a demonstration. For production use, you'll need to configure Plaid with your own credentials and go through their verification process.
          </div>
        </div>
      </div>
    </div>
  )
}
