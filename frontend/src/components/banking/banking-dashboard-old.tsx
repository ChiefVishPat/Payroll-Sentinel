'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@frontend/components/ui/card'
import { Button } from '@frontend/components/ui/button'
import { formatCurrency, formatDate, getStatusColor } from '@frontend/lib/utils'
import { api } from '@frontend/lib/api'
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

export default function BankingDashboard() {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchBankingData()
  }, [])

  const fetchBankingData = async () => {
    try {
      setLoading(true)
      const companyId = 'demo-company'
      
      // Try to fetch real data, fall back to mock data
      let accountsData = []
      let transactionsData = []
      let statusData = null

      try {
        const [accountsRes, transactionsRes, statusRes] = await Promise.all([
          api.banking.getAccounts(companyId),
          api.banking.getTransactions(companyId),
          api.banking.getStatus(companyId)
        ])
        
        // extract payload arrays from API wrapper
        accountsData = accountsRes.data?.data || []
        transactionsData = transactionsRes.data?.data || []
        // status endpoint returns raw or wrapped data
        statusData = statusRes.data?.data ?? statusRes.data
      } catch (error) {
        console.log('Banking API not available, using mock data')
        
        // Mock data
        accountsData = [
          {
            id: '1',
            name: 'Business Checking',
            type: 'checking',
            balance: 125000,
            availableBalance: 124500,
            institutionName: 'Chase Bank',
            lastUpdated: new Date().toISOString()
          },
          {
            id: '2', 
            name: 'Business Savings',
            type: 'savings',
            balance: 75000,
            availableBalance: 75000,
            institutionName: 'Chase Bank',
            lastUpdated: new Date().toISOString()
          },
          {
            id: '3',
            name: 'Business Credit Line',
            type: 'credit',
            balance: -15000,
            availableBalance: 35000,
            institutionName: 'American Express',
            lastUpdated: new Date().toISOString()
          }
        ]

        transactionsData = [
          {
            id: '1',
            accountId: '1',
            amount: -65000,
            description: 'Payroll Transfer',
            category: 'Payroll',
            date: '2025-01-09',
            type: 'debit'
          },
          {
            id: '2',
            accountId: '1',
            amount: 25000,
            description: 'Client Payment - ABC Corp',
            category: 'Income',
            date: '2025-01-08',
            type: 'credit'
          },
          {
            id: '3',
            accountId: '1',
            amount: -8000,
            description: 'Office Rent',
            category: 'Rent',
            date: '2025-01-07',
            type: 'debit'
          },
          {
            id: '4',
            accountId: '1',
            amount: -2500,
            description: 'Software Subscriptions',
            category: 'Software',
            date: '2025-01-06',
            type: 'debit'
          },
          {
            id: '5',
            accountId: '2',
            amount: 15000,
            description: 'Transfer from Checking',
            category: 'Transfer',
            date: '2025-01-05',
            type: 'credit'
          }
        ]

        statusData = {
          connected: true,
          lastSync: new Date().toISOString(),
          accountCount: 3,
          status: 'healthy'
        }
      }

      setAccounts(accountsData)
      setTransactions(transactionsData)
      setStatus(statusData)
    } catch (error) {
      console.error('Error fetching banking data:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshBankData = async () => {
    try {
      setRefreshing(true)
      await api.banking.refresh()
      await fetchBankingData()
    } catch (error) {
      console.error('Error refreshing bank data:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const getTotalBalance = () => {
    return accounts.reduce((total, account) => {
      return total + (account.type === 'credit' ? 0 : account.balance)
    }, 0)
  }

  const getTotalAvailable = () => {
    return accounts.reduce((total, account) => {
      return total + account.availableBalance
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
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Connect Account
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(getTotalBalance())}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Across {accounts.length} accounts
            </p>
          </CardContent>
        </Card>

        <Card>
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

        <Card>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {transactions.length}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Transactions this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bank Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Bank Accounts</CardTitle>
          <CardDescription>
            Connected bank accounts and balances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {accounts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No bank accounts connected
              </div>
            ) : (
              accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-4 border rounded">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gray-100 rounded">
                      <CreditCard className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <div className="font-medium">{account.name}</div>
                      <div className="text-sm text-gray-600">{account.institutionName}</div>
                      <div className="text-xs text-gray-500 capitalize">{account.type} account</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-semibold ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(account.balance)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Available: {formatCurrency(account.availableBalance)}
                    </div>
                    <div className="text-xs text-gray-500">
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
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            Latest banking transactions across all accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No recent transactions
              </div>
            ) : (
              transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
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
                      Account: {accounts.find(a => a.id === transaction.accountId)?.name || 'Unknown'}
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
