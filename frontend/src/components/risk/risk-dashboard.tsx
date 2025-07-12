'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@frontend/components/ui/card'
import { Button } from '@frontend/components/ui/button'
import { formatDateTime, getRiskColor } from '@frontend/lib/utils'
import { api } from '@frontend/lib/api'
import { RiskAssessment, RiskAlert } from '@frontend/types'
import { 
  Shield, 
  AlertTriangle, 
  TrendingUp, 
  RefreshCw,
  CheckCircle,
  XCircle
} from 'lucide-react'

export default function RiskDashboard() {
  const [riskStatus, setRiskStatus] = useState<any>(null)
  const [assessments, setAssessments] = useState<RiskAssessment[]>([])
  const [alerts, setAlerts] = useState<RiskAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)

  useEffect(() => {
    fetchRiskData()
  }, [])
  const fetchRiskData = async () => {
    try {
      setLoading(true)
      const companyId = 'demo-company'
      
      // Try to fetch real data, fall back to mock data
      let statusData = null
      let assessmentsData = []
      let alertsData = []

      try {
        const [statusRes, assessmentsRes, alertsRes] = await Promise.all([
          api.risk.getStatus(companyId),
          api.risk.getAssessments(companyId),
          api.risk.getAlerts(companyId)
        ])

        statusData = statusRes.data
        assessmentsData = assessmentsRes.data || []
        alertsData = alertsRes.data || []
      } catch (error) {
        console.log('Risk API not available, using mock data')
        
        // Use mock data
        statusData = {
          overallRisk: 'medium',
          score: 65,
          lastAssessment: new Date().toISOString(),
          factors: [
            { category: 'Cash Flow', score: 70, impact: 'medium' },
            { category: 'Payroll', score: 80, impact: 'low' },
            { category: 'Banking', score: 60, impact: 'high' }
          ]
        }
        
        alertsData = [
          {
            id: '1',
            type: 'cash_flow',
            level: 'medium',
            title: 'Cash Flow Warning',
            description: 'Projected cash flow may be insufficient in 30 days',
            timestamp: new Date().toISOString(),
            acknowledged: false,
            resolved: false
          },
          {
            id: '2',
            type: 'payroll',
            level: 'low',
            title: 'Payroll Scheduled',
            description: 'Next payroll run scheduled for tomorrow',
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            acknowledged: true,
            resolved: false
          }
        ]
      }

      setRiskStatus(statusData)
      setAssessments(assessmentsData)
      setAlerts(alertsData)
    } catch (error) {
      console.error('Error fetching risk data:', error)
    } finally {
      setLoading(false)
    }
  }

  const triggerAssessment = async () => {
    try {
      setTriggering(true)
      await api.risk.triggerAssessment()
      await fetchRiskData()
    } catch (error) {
      console.error('Error triggering assessment:', error)
    } finally {
      setTriggering(false)
    }
  }

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await api.risk.acknowledgeAlert(alertId)
      setAlerts(alerts.map(alert => 
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      ))
    } catch (error) {
      console.error('Error acknowledging alert:', error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
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

  const riskLevelColor = riskStatus?.overallRisk === 'high' ? 'text-red-600' : 
                       riskStatus?.overallRisk === 'medium' ? 'text-yellow-600' : 'text-green-600'

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Risk Analysis</h1>
          <p className="text-gray-600">Monitor and assess financial risks</p>
        </div>
        <Button 
          onClick={triggerAssessment} 
          disabled={triggering}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${triggering ? 'animate-spin' : ''}`} />
          {triggering ? 'Running...' : 'Run Assessment'}
        </Button>
      </div>

      {/* Risk Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Risk Level</CardTitle>
            <Shield className={`h-4 w-4 ${riskLevelColor}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${riskLevelColor}`}>
              {riskStatus?.overallRisk?.charAt(0).toUpperCase() + riskStatus?.overallRisk?.slice(1)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Risk Score: {riskStatus?.score}/100
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {alerts.filter(a => !a.acknowledged).length}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Unacknowledged alerts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Assessment</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {riskStatus?.lastAssessment ? formatDateTime(riskStatus.lastAssessment).split(',')[0] : 'N/A'}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {riskStatus?.lastAssessment ? formatDateTime(riskStatus.lastAssessment).split(',')[1] : 'No recent assessment'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Factors */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Factors</CardTitle>
          <CardDescription>
            Breakdown of risk assessment by category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {riskStatus?.factors?.map((factor: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">{factor.category}</div>
                  <div className="text-sm text-gray-600">Impact: {factor.impact}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{factor.score}/100</div>
                  <div className={`text-sm px-2 py-1 rounded ${getRiskColor(factor.impact)}`}>
                    {factor.impact}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
          <CardDescription>
            Recent risk alerts and notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No active alerts
              </div>
            ) : (
              alerts.map((alert) => (
                <div key={alert.id} className="flex items-start justify-between p-4 border rounded">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`px-2 py-1 text-xs rounded ${getRiskColor(alert.level)}`}>
                        {alert.level}
                      </div>
                      <div className="text-xs text-gray-500">
                        {alert.type.replace('_', ' ')}
                      </div>
                    </div>
                    <div className="font-medium">{alert.title}</div>
                    <div className="text-sm text-gray-600 mt-1">{alert.description}</div>
                    <div className="text-xs text-gray-500 mt-2">
                      {formatDateTime(alert.timestamp)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {alert.acknowledged ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        Acknowledge
                      </Button>
                    )}
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
