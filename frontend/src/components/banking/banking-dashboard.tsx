'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { usePlaidLink } from 'react-plaid-link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@frontend/components/ui/card'
import { Button } from '@frontend/components/ui/button'
import { formatCurrency, formatDate, getStatusColor } from '@frontend/lib/utils'
import { api, apiClient } from '@frontend/lib/api'
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

// Generic fetcher for SWR using the Axios client
const fetcher = (url: string) =>
  apiClient.get(url).then(res => res.data?.data ?? res.data)

export default function BankingDashboard() {
  const companyId = 'demo-company'
  const {
    data: accounts,
    error: accountsError,
    isLoading: accountsLoading,
    mutate: mutateAccounts,
  } = useSWR<BankAccount[]>(`/api/banking/accounts?companyId=${companyId}`,
    fetcher,
    { refreshInterval: 30000 },
  )
  const {
    data: transactions,
    error: transactionsError,
    isLoading: transactionsLoading,
    mutate: mutateTransactions,
  } = useSWR<Transaction[]>(`/api/banking/transactions?companyId=${companyId}`,
    fetcher,
    { refreshInterval: 30000 },
  )
  const {
    data: status,
    error: statusError,
    isLoading: statusLoading,
    mutate: mutateStatus,
  } = useSWR<any>(`/api/banking/status?companyId=${companyId}`,
    fetcher,
    { refreshInterval: 30000 },
  )
  const [refreshing, setRefreshing] = useState(false)
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  const loading = accountsLoading || transactionsLoading || statusLoading
  const hasError = accountsError || transactionsError || statusError

  useEffect(() => {
    getLinkToken()
  }, [])

  // Log errors and show a simple message when data fails to load
  if (hasError) {
    console.error('Error fetching banking data', accountsError || transactionsError || statusError)
  }

  // Obtain a one-time token for Plaid Link
  const getLinkToken = async () => {
    try {
      const response = await api.banking.linkToken('sandbox-user-123', 'demo-company')
      setLinkToken(response.data.linkToken)
      console.log('Link token obtained:', response.data.linkToken)
    } catch (error) {
      console.error('Failed to get link token:', error)
    }
  }

  // Exchange the public token for an access token and refresh data
  const onPlaidSuccess = async (public_token: string, metadata: any) => {
    console.log('Plaid Link success:', public_token)
    setIsConnecting(true)
    try {
      await api.banking.exchangeToken(public_token, 'demo-company')
      console.log('Successfully exchanged public token')
      await Promise.all([
        mutateAccounts(),
        mutateTransactions(),
        mutateStatus(),
      ])
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

  // Trigger backend sync and refetch SWR data
  const refreshBankData = async () => {
    try {
      setRefreshing(true)
      await api.banking.refresh()
      await Promise.all([
        mutateAccounts(),
        mutateTransactions(),
        mutateStatus(),
      ])
    } catch (error) {
      console.error('Error refreshing bank data:', error)
    } finally {
      setRefreshing(false)
    }
  }

  // Open Plaid Link to connect a new account
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

  // Aggregate the balances of all non-credit accounts
  const getTotalBalance = () => {
    return (accounts ?? []).reduce((total, account) => {
      return total + (account.type === 'credit' ? 0 : account.balance)
    }, 0)
  }

  // Sum of currently available funds across accounts
  const getTotalAvailable = () => {
    return (accounts ?? []).reduce((total, account) => {
      return total + account.availableBalance
    }, 0)
  }

  if (hasError) {
    return (
      <div className="text-center text-red-600">Error loading banking data</div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse dark:bg-gray-800 dark:border-gray-700">
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
          <h1 className="text-2xl font-bold text-gray-900">Banking</h1>
          <p className="text-gray-600">Manage bank accounts and transactions</p>
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
            {isConnecting ? 'Connecting...' : 'Link another account'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(getTotalBalance())}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Across {accounts?.length ?? 0} accounts
            </p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Funds</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(getTotalAvailable())}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Available to spend
            </p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
            <Building className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {status?.connected ? 'Connected' : 'Disconnected'}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Last sync: {status?.lastSync ? formatDate(status.lastSync) : 'Never'}
            </p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {(transactions?.length ?? 0)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Transactions this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bank Accounts */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle>Bank Accounts</CardTitle>
          <CardDescription>
            Connected bank accounts and balances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(accounts?.length ?? 0) === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800">
                <p className="text-gray-500">No bank accounts connected</p>
                <p className="text-sm text-gray-500 mt-2">Use "Link another account" to add your first bank account.</p>
              </div>
            ) : (
              (accounts ?? []).map((account) => (
                <div key={account.id} className="flex items-center justify-between p-4 border rounded dark:bg-gray-800 dark:border-gray-700">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
                      <CreditCard className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <div className="font-medium">{account.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">{account.institutionName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{account.type} account</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-semibold ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(account.balance)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Available: {formatCurrency(account.availableBalance)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Updated: {formatDate(account.lastUpdated)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            Latest banking transactions across all accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(transactions?.length ?? 0) === 0 ? (
              <div className="p-3 text-center bg-gray-100 dark:bg-gray-800 text-gray-500 rounded">
                No transactions yet — come back after your first payment clears.
              </div>
            ) : (
              (transactions ?? []).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
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
                      <div className="text-sm text-gray-600">{transaction.category}</div>
                      <div className="text-xs text-gray-500">{formatDate(transaction.date)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Account: {(accounts ?? []).find(a => a.id === transaction.accountId)?.name || 'Unknown'}
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
