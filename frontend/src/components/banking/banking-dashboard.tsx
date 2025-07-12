'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { usePlaidLink } from 'react-plaid-link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@frontend/components/ui/card'
import { Button } from '@frontend/components/ui/button'
import { formatCurrency, formatDate } from '@frontend/lib/utils'
import { api, apiClient } from '@frontend/lib/api'
import { useCompany } from '@frontend/context/CompanyContext'
import CompanySelector from '@frontend/components/CompanySelector'
import { BankAccount, Transaction } from '@frontend/types'
import { 
  CreditCard, 
  Building, 
  RefreshCw, 
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar
} from 'lucide-react'

/**
 * Simple SWR fetcher using the shared Axios client.
 */
const fetcher = (url: string) =>
  apiClient.get(url).then(res => res.data?.accounts || res.data?.transactions || res.data)

/**
 * Dashboard view for banking data.
 * Shows linked accounts and recent transactions using SWR to poll the backend.
 */
export default function BankingDashboard() {
  const { companyId } = useCompany()

  if (!companyId) {
    return <CompanySelector />
  }
  const { data: accounts, isLoading: loadingAccounts, mutate: mutateAccounts } =
    useSWR(() => `/api/banking/accounts?companyId=${companyId}`, fetcher, {
      refreshInterval: 30000
    })
  const {
    data: transactions,
    mutate: mutateTransactions,
    isLoading: loadingTx
  } = useSWR(
    () => `/api/banking/transactions?companyId=${companyId}`,
    fetcher
  )
  const { data: status, mutate: mutateStatus } = useSWR(
    () => `/api/banking/status?companyId=${companyId}`,
    fetcher
  )

  const [refreshing, setRefreshing] = useState(false)
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  const loading = loadingAccounts || loadingTx || !status

  useEffect(() => {
    getLinkToken()
  }, [])

  const getLinkToken = async () => {
    try {
      const response = await api.banking.linkToken('sandbox-user-123', companyId)
      setLinkToken(response.data.linkToken)
      console.log('Link token obtained:', response.data.linkToken)
    } catch (error) {
      console.error('Failed to get link token:', error)
    }
  }

  const onPlaidSuccess = async (public_token: string, metadata: any) => {
    console.log('Plaid Link success:', public_token)
    setIsConnecting(true)
    try {
      await api.banking.exchangeToken(public_token, companyId)
      console.log('Successfully exchanged public token')
      await Promise.all([mutateAccounts(), mutateTransactions(), mutateStatus()])
    } catch (error) {
      console.error('Failed to exchange token:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  const onPlaidExit = (err: any, metadata: any) => {
    console.log('Plaid Link exited:', err, metadata)
    setIsConnecting(false)
  }

  const { open: openPlaid, ready: plaidReady } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: onPlaidExit,
  })

  const refreshBankData = async () => {
    try {
      setRefreshing(true)
      await api.banking.refresh(companyId)
      await Promise.all([mutateAccounts(), mutateTransactions(), mutateStatus()])
    } catch (error) {
      console.error('Error refreshing bank data:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const connectAccount = async () => {
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
    openPlaid()
  }

  const getTotalBalance = () => {
    if (!accounts) return 0
    return accounts.reduce((total, account) => {
      return total + (account.type === 'credit' ? 0 : (account as any).balance)
    }, 0)
  }

  const getTotalAvailable = () => {
    if (!accounts) return 0
    return accounts.reduce((total, account) => {
      return total + (account as any).availableBalance
    }, 0)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#EAEAEA]">Banking</h1>
          <p className="text-[#B0B0B0]">Manage bank accounts and transactions</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={refreshBankData} 
            disabled={refreshing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Syncing...' : 'Refresh'}
          </Button>
          <Button 
            onClick={connectAccount}
            disabled={isConnecting || !plaidReady}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {isConnecting
              ? 'Connecting...'
              : accounts && accounts.length > 0
              ? 'Link another account'
              : 'Connect Account'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(getTotalBalance())}
            </div>
            <p className="text-xs text-[#B0B0B0] mt-1">
              Across {accounts?.length || 0} accounts
            </p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Funds</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(getTotalAvailable())}
            </div>
            <p className="text-xs text-[#B0B0B0] mt-1">
              Available to spend
            </p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
            <Building className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {status?.connected ? 'Connected' : 'Disconnected'}
            </div>
            <p className="text-xs text-[#B0B0B0] mt-1">
              Last sync: {status?.lastSync ? formatDate(status.lastSync) : 'Never'}
            </p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {transactions?.length || 0}
            </div>
            <p className="text-xs text-[#B0B0B0] mt-1">
              Transactions this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bank Accounts */}
      <Card className="dark:bg-gray-800">
        <CardHeader>
          <CardTitle>Bank Accounts</CardTitle>
          <CardDescription>Connected bank accounts and balances</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!accounts || accounts.length === 0 ? (
              <div className="flex items-center justify-between p-4 border rounded w-full">
                <div className="font-medium">No bank connection yet</div>
                <Button onClick={connectAccount} disabled={isConnecting || !plaidReady}>
                  Link Bank Account
                </Button>
              </div>
            ) : (
              accounts.map(account => (
                <div key={account.id} className="flex items-center justify-between p-4 border rounded dark:border-gray-700">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-[#2C2C2C] rounded">
                      <CreditCard className="h-6 w-6 text-[#B0B0B0]" />
                    </div>
                    <div>
                      <div className="font-medium">{account.name}</div>
                      <div className="text-sm text-[#B0B0B0]">{account.institutionName}</div>
                      <div className="text-xs text-[#B0B0B0] capitalize">{account.type} account</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-semibold ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}> 
                      {formatCurrency((account as any).balance)}
                    </div>
                    <div className="text-sm text-[#B0B0B0]">
                      Available: {formatCurrency((account as any).availableBalance)}
                    </div>
                    <div className="text-xs text-[#B0B0B0]">
                      Updated: {formatDate((account as any).lastUpdated)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="dark:bg-gray-800">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            Latest banking transactions across all accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!transactions || transactions.length === 0 ? (
              <div className="p-4 text-center text-[#B0B0B0] border rounded dark:border-gray-700">
                No recent transactions
              </div>
            ) : (
              transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 bg-[#2C2C2C] rounded">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded ${transaction.type === 'credit' ? 'bg-green-100' : 'bg-red-100'}`}>
                      {transaction.type === 'credit' ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{transaction.description}</div>
                      <div className="text-sm text-[#B0B0B0]">{transaction.category}</div>
                      <div className="text-xs text-[#B0B0B0]">{formatDate(transaction.date)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                    </div>
                    <div className="text-xs text-[#B0B0B0]">
                      Account: {accounts?.find(a => a.id === transaction.accountId)?.name || 'Unknown'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
