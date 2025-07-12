'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@frontend/components/ui/card'
import { Button } from '@frontend/components/ui/button'
import { formatCurrency, formatDate, getStatusColor } from '@frontend/lib/utils'
import { api } from '@frontend/lib/api'
import { PayrollRun, Employee } from '@frontend/types'
import { 
  Users, 
  DollarSign, 
  Calendar, 
  CheckCircle,
  Clock,
  Play,
  RefreshCw
} from 'lucide-react'

export default function PayrollDashboard() {
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPayrollData()
  }, [])

  const fetchPayrollData = async () => {
    try {
      setLoading(true)
      const companyId = 'demo-company'
      
      let runsData = []
      let employeesData = []
      let summaryData = null

      try {
        const [runsRes, employeesRes, summaryRes] = await Promise.all([
          api.payroll.getRuns(companyId),
          api.payroll.getEmployees(companyId),
          api.payroll.getSummary(companyId)
        ])

        runsData = runsRes.data || []
        employeesData = employeesRes.data || []
        summaryData = summaryRes.data
      } catch (error) {
        console.log('Payroll API not available, using mock data')
        
        // Use mock data
        runsData = [
          {
            id: '1',
            payPeriod: '2025-01-01 to 2025-01-15',
            scheduledDate: '2025-01-16',
            status: 'pending',
            totalAmount: 65000,
            employeeCount: 12,
            entries: []
          },
          {
            id: '2',
            payPeriod: '2024-12-16 to 2024-12-31',
            scheduledDate: '2025-01-01',
            status: 'processed',
            totalAmount: 62000,
            employeeCount: 12,
            entries: []
          }
        ]
        
        employeesData = [
          {
            id: '1',
            name: 'John Doe',
            position: 'Software Engineer',
            salary: 85000,
            status: 'active',
            startDate: '2024-01-15',
            department: 'Engineering'
          },
          {
            id: '2',
            name: 'Jane Smith',
            position: 'Product Manager',
            salary: 95000,
            status: 'active',
            startDate: '2024-02-01',
            department: 'Product'
          }
        ]
        
        summaryData = {
          totalEmployees: 12,
          activeEmployees: 12,
          totalMonthlySalary: 65000,
          nextPayrollDate: '2025-01-16'
        }
      }

      setPayrollRuns(runsData)
      setEmployees(employeesData)
      setSummary(summaryData)
    } catch (error) {
      console.error('Error fetching payroll data:', error)
    } finally {
      setLoading(false)
    }
  }

  const approvePayroll = async (runId: string) => {
    try {
      await api.payroll.approveRun(runId)
      setPayrollRuns(runs => runs.map(run => 
        run.id === runId ? { ...run, status: 'approved' } : run
      ))
    } catch (error) {
      console.error('Error approving payroll:', error)
    }
  }

  const processPayroll = async (runId: string) => {
    try {
      await api.payroll.processRun(runId)
      setPayrollRuns(runs => runs.map(run => 
        run.id === runId ? { ...run, status: 'processed' } : run
      ))
    } catch (error) {
      console.error('Error processing payroll:', error)
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
          <p className="text-gray-600">Manage payroll runs and employees</p>
        </div>
        <Button 
          onClick={fetchPayrollData}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {summary?.totalEmployees || 0}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {summary?.activeEmployees || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Payroll</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary?.totalMonthlySalary || 0)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Total monthly cost
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Payroll</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {summary?.nextPayrollDate ? formatDate(summary.nextPayrollDate) : 'Not scheduled'}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Scheduled date
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Runs</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {payrollRuns.filter(run => run.status === 'pending' || run.status === 'draft').length}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Awaiting approval
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payroll Runs */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Runs</CardTitle>
          <CardDescription>
            Recent and upcoming payroll runs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {payrollRuns.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No payroll runs found
              </div>
            ) : (
              payrollRuns.map((run) => (
                <div key={run.id} className="flex items-center justify-between p-4 border rounded">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`px-2 py-1 text-xs rounded ${getStatusColor(run.status)}`}>
                        {run.status}
                      </div>
                      <div className="font-medium">{run.payPeriod}</div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatCurrency(run.totalAmount)} for {run.employeeCount} employees
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Scheduled: {formatDate(run.scheduledDate)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {run.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => approvePayroll(run.id)}
                        className="flex items-center gap-1"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </Button>
                    )}
                    {run.status === 'approved' && (
                      <Button
                        size="sm"
                        onClick={() => processPayroll(run.id)}
                        className="flex items-center gap-1"
                      >
                        <Play className="h-4 w-4" />
                        Process
                      </Button>
                    )}
                    {run.status === 'processed' && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <CardTitle>Employees</CardTitle>
          <CardDescription>
            Active employee roster
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {employees.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No employees found
              </div>
            ) : (
              employees.map((employee) => (
                <div key={employee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex-1">
                    <div className="font-medium">{employee.name}</div>
                    <div className="text-sm text-gray-600">{employee.position}</div>
                    <div className="text-xs text-gray-500">
                      {employee.department} • Started {formatDate(employee.startDate)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(employee.salary)}</div>
                    <div className={`text-sm px-2 py-1 rounded ${getStatusColor(employee.status)}`}>
                      {employee.status}
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
