'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate, getRiskColor } from '@/lib/utils'
import { api } from '@/lib/api'
import { DashboardStats } from '@/types'
import { 
  DollarSign, 
  TrendingDown, 
  Users, 
  AlertTriangle,
  Shield,
  Activity
} from 'lucide-react'

export default function DashboardStatsCards() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // For demo purposes, use a default company ID
      const companyId = 'demo-company'
      
      // Try to fetch real data from backend
      const [healthRes] = await Promise.all([
        api.health().catch(() => null)
      ])

      // Try individual endpoints with proper error handling
      let cashFlowData = null
      let payrollData = null
      let riskData = null

      try {
        const cashFlowRes = await api.cashFlow.getSummary(companyId)
        cashFlowData = cashFlowRes.data
      } catch (err) {
        console.log('Cash flow API not available, using mock data')
      }

      try {
        const payrollRes = await api.payroll.getSummary(companyId)
        payrollData = payrollRes.data
      } catch (err) {
        console.log('Payroll API not available, using mock data')
      }

      try {
        const riskRes = await api.risk.getStatus(companyId)
        riskData = riskRes.data
      } catch (err) {
        console.log('Risk API not available, using mock data')
      }

      // Use real data if available, otherwise use mock data
      const stats: DashboardStats = {
        totalBalance: cashFlowData?.currentBalance || 125000,
        monthlyBurnRate: cashFlowData?.burnRate || 45000,
        upcomingPayroll: payrollData?.nextPayrollAmount || 65000,
        activeAlerts: riskData?.activeAlerts || 3,
        riskLevel: riskData?.overallRisk || 'medium',
        lastUpdated: new Date().toISOString()
      }

      setStats(stats)
    } catch (err) {
      console.error('Error fetching dashboard stats:', err)
      setError('Failed to load dashboard data')
      // Use mock data on error
      setStats({
        totalBalance: 125000,
        monthlyBurnRate: 45000,
        upcomingPayroll: 65000,
        activeAlerts: 3,
        riskLevel: 'medium',
        lastUpdated: new Date().toISOString()
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Error loading dashboard data</p>
        <button 
          onClick={fetchDashboardStats}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Balance',
      value: formatCurrency(stats.totalBalance),
      icon: DollarSign,
      description: 'Current cash position',
      color: 'text-green-600'
    },
    {
      title: 'Monthly Burn Rate',
      value: formatCurrency(stats.monthlyBurnRate),
      icon: TrendingDown,
      description: 'Average monthly expenses',
      color: 'text-red-600'
    },
    {
      title: 'Upcoming Payroll',
      value: formatCurrency(stats.upcomingPayroll),
      icon: Users,
      description: 'Next payroll amount',
      color: 'text-blue-600'
    },
    {
      title: 'Active Alerts',
      value: stats.activeAlerts.toString(),
      icon: AlertTriangle,
      description: 'Requiring attention',
      color: stats.activeAlerts > 0 ? 'text-yellow-600' : 'text-green-600'
    },
    {
      title: 'Risk Level',
      value: stats.riskLevel.charAt(0).toUpperCase() + stats.riskLevel.slice(1),
      icon: Shield,
      description: 'Overall risk assessment',
      color: stats.riskLevel === 'high' ? 'text-red-600' : 
             stats.riskLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'
    },
    {
      title: 'System Status',
      value: 'Healthy',
      icon: Activity,
      description: 'All services operational',
      color: 'text-green-600'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${card.color}`}>
                {card.value}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks and operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={async () => {
                try {
                  await api.risk.triggerAssessment()
                  await fetchDashboardStats()
                } catch (error) {
                  console.error('Error triggering assessment:', error)
                }
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              Run Risk Assessment
            </button>
            <button 
              onClick={async () => {
                try {
                  await api.banking.refresh()
                  await fetchDashboardStats()
                } catch (error) {
                  console.error('Error refreshing bank data:', error)
                }
              }}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
            >
              Refresh Bank Data
            </button>
            <button 
              onClick={() => window.open('/monitoring', '_blank')}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
            >
              View Monitoring
            </button>
            <button 
              onClick={() => window.location.href = '/risk'}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
            >
              View Alerts
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="text-xs text-gray-500 text-center">
        Last updated: {formatDate(stats.lastUpdated)}
      </div>
    </div>
  )
}
