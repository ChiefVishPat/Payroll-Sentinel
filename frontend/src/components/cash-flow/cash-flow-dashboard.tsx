'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@frontend/components/ui/card'
import { Button } from '@frontend/components/ui/button'
import { formatCurrency, formatDate } from '@frontend/lib/utils'
import { api } from '@frontend/lib/api'
import { CashFlowSummary, CashFlowProjection } from '@frontend/types'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  Calendar,
  BarChart3
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

export default function CashFlowDashboard() {
  const [summary, setSummary] = useState<CashFlowSummary | null>(null)
  const [projections, setProjections] = useState<CashFlowProjection[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchCashFlowData()
  }, [])

  const fetchCashFlowData = async () => {
    try {
      setLoading(true)
      const companyId = 'demo-company'
      
      let summaryData = null
      let projectionsData = []

      try {
        const [summaryRes, projectionsRes] = await Promise.all([
          api.cashFlow.getSummary(companyId),
          api.cashFlow.getProjections(companyId)
        ])

        summaryData = summaryRes.data
        projectionsData = projectionsRes.data || []
      } catch (error) {
        console.log('Cash flow API not available, using mock data')
        
        // Use mock data
        summaryData = {
          currentBalance: 125000,
          projectedBalance: 98000,
          burnRate: 45000,
          runway: 2.8,
          lastUpdated: new Date().toISOString()
        }
        
        projectionsData = [
          { date: '2025-01-01', projected: 125000, actual: 125000, inflow: 80000, outflow: 45000 },
          { date: '2025-02-01', projected: 110000, inflow: 75000, outflow: 48000 },
          { date: '2025-03-01', projected: 95000, inflow: 70000, outflow: 50000 },
          { date: '2025-04-01', projected: 78000, inflow: 65000, outflow: 52000 },
          { date: '2025-05-01', projected: 58000, inflow: 60000, outflow: 55000 },
          { date: '2025-06-01', projected: 35000, inflow: 55000, outflow: 58000 }
        ]
      }

      setSummary(summaryData)
      setProjections(projectionsData)
    } catch (error) {
      console.error('Error fetching cash flow data:', error)
    } finally {
      setLoading(false)
    }
  }

  const recalculateProjections = async () => {
    try {
      setRefreshing(true)
      await api.cashFlow.recalculate()
      await fetchCashFlowData()
    } catch (error) {
      console.error('Error recalculating projections:', error)
    } finally {
      setRefreshing(false)
    }
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

  const runwayColor = (summary?.runway || 0) > 3 ? 'text-green-600' : 
                     (summary?.runway || 0) > 1 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cash Flow</h1>
          <p className="text-gray-600">Monitor and forecast cash flow</p>
        </div>
        <Button 
          onClick={recalculateProjections} 
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Updating...' : 'Recalculate'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary?.currentBalance || 0)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Available funds
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projected Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(summary?.projectedBalance || 0)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              30-day projection
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Burn Rate</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary?.burnRate || 0)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Average monthly expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Runway</CardTitle>
            <Calendar className={`h-4 w-4 ${runwayColor}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${runwayColor}`}>
              {summary?.runway?.toFixed(1) || '0.0'} months
            </div>
            <p className="text-xs text-gray-600 mt-1">
              At current burn rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Projections</CardTitle>
          <CardDescription>
            6-month cash flow forecast
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={projections}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => formatDate(value).split(',')[0]}
              />
              <YAxis tickFormatter={(value) => `$${value / 1000}k`} />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => formatDate(label)}
              />
              <Line 
                type="monotone" 
                dataKey="projected" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Projected Balance"
              />
              {projections.some(p => p.actual) && (
                <Line 
                  type="monotone" 
                  dataKey="actual" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Actual Balance"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cash Flow Components */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Inflows</CardTitle>
            <CardDescription>
              Expected incoming cash
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={projections}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => formatDate(value).split(',')[0]}
                />
                <YAxis tickFormatter={(value) => `$${value / 1000}k`} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => formatDate(label)}
                />
                <Bar dataKey="inflow" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Outflows</CardTitle>
            <CardDescription>
              Expected outgoing cash
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={projections}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => formatDate(value).split(',')[0]}
                />
                <YAxis tickFormatter={(value) => `$${value / 1000}k`} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => formatDate(label)}
                />
                <Bar dataKey="outflow" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest cash flow transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { date: '2025-01-09', description: 'Payroll - January 2025', amount: -65000, type: 'payroll' },
              { date: '2025-01-08', description: 'Client Payment - ABC Corp', amount: 25000, type: 'income' },
              { date: '2025-01-07', description: 'Office Rent - January', amount: -8000, type: 'expense' },
              { date: '2025-01-06', description: 'Software Subscriptions', amount: -2500, type: 'expense' },
              { date: '2025-01-05', description: 'Client Payment - XYZ Ltd', amount: 15000, type: 'income' }
            ].map((transaction, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">{transaction.description}</div>
                  <div className="text-sm text-gray-600">{formatDate(transaction.date)}</div>
                </div>
                <div className="text-right">
                  <div className={`font-semibold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                  </div>
                  <div className="text-sm text-gray-500 capitalize">{transaction.type}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
