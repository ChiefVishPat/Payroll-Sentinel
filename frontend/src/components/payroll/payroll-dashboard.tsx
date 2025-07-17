'use client'

import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@frontend/components/ui/card'
import { Button } from '@frontend/components/ui/button'
import { formatCurrency, formatDate, getStatusColor } from '@frontend/lib/utils'
import { api, apiClient } from '@frontend/lib/api'
import { useCompany } from '@frontend/context/CompanyContext'
import CompanySelector from '@frontend/components/CompanySelector'
import { PayrollRun } from '@frontend/types'
import type { Employee } from '@frontend/shared/types'
import {
  Users,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  Play,
  RefreshCw
} from 'lucide-react'
import { Dialog, DialogTrigger, DialogContent, DialogClose } from '@frontend/components/ui/dialog'
import { useState } from 'react'
import { DEPARTMENTS, TITLES } from '@frontend/lib/job-data'
import EmployeeDetailPanel from '@frontend/components/payroll/employee-detail-panel'

/**
 * Payroll dashboard page showing payroll data and employee roster.
 * SWR auto refresh is disabled so the modal form doesn't reset while typing.
 */
  export default function PayrollDashboard() {
    const { companyId } = useCompany()
    const [open, setOpen] = useState(false)
    const [detailOpen, setDetailOpen] = useState(false)
    const [selected, setSelected] = useState<Employee | null>(null)

    const fetcher = (url: string) => apiClient.get(url).then(res => res.data)

    // Allow initial fetch on mount so dashboard loads data automatically
    const swrOpts = {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateOnMount: true,
      revalidateIfStale: false,
      refreshInterval: 0,
    }

    const { data: payrollRuns, isLoading: loadingRuns, mutate: mutRuns } =
      useSWR(
        companyId ? `/api/payroll/runs?companyId=${companyId}` : null,
        fetcher,
        swrOpts
      )
    const { data: employees, isLoading: loadingEmp, mutate: mutEmp } = useSWR(
      companyId ? `/api/payroll/employees?companyId=${companyId}` : null,
      fetcher,
      swrOpts
    )
    const { data: summary, isLoading: loadingSummary, mutate: mutSum } = useSWR(
      companyId ? `/api/payroll/summary?companyId=${companyId}` : null,
      fetcher,
      swrOpts
    )

    if (!companyId) {
      return <CompanySelector />
    }

  const loading = loadingRuns || loadingEmp || loadingSummary

  const refreshData = async () => {
    await Promise.all([mutRuns(), mutEmp(), mutSum()])
  }

  const approvePayroll = async (runId: string) => {
    try {
      await api.payroll.approveRun(runId, companyId)
      await mutRuns()
    } catch (error) {
      console.error('Error approving payroll:', error)
    }
  }

  const processPayroll = async (runId: string) => {
    try {
      await api.payroll.processRun(runId, companyId)
      await mutRuns()
    } catch (error) {
      console.error('Error processing payroll:', error)
    }
  }

  /** Trigger a new payroll run */
  const runPayroll = async () => {
    try {
      await api.payroll.runPayroll({ companyId })
      await Promise.all([mutRuns(), mutSum()])
    } catch (err) {
      console.error('Run payroll failed', err)
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
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <span className="text-xl">➕</span> Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="text-black">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Add Employee</h2>
                <DialogClose asChild>
                  <Button variant="ghost" size="sm">Close</Button>
                </DialogClose>
              </div>
              <form
                onSubmit={async e => {
                  e.preventDefault()
                  const formData = new FormData(e.currentTarget)
                  await api.payroll.addEmployee({
                    companyId,
                    name: formData.get('name'),
                    title: formData.get('title'),
                    salary: Number(formData.get('salary') || 0),
                    status: formData.get('status'),
                    department: formData.get('department'),
                  })
                  await Promise.all([mutEmp(), mutSum()])
                  setOpen(false)
                  e.currentTarget.reset()
                }}
                className="space-y-4"
              >
                <input
                  name="name"
                  placeholder="Name"
                  className="w-full border p-2 rounded text-black"
                  required
                />
                <input
                  list="title-options"
                  name="title"
                  placeholder="Title"
                  className="w-full border p-2 rounded text-black"
                  required
                />
                <datalist id="title-options">
                  {TITLES.map(t => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
                <input
                  list="department-options"
                  name="department"
                  placeholder="Department"
                  className="w-full border p-2 rounded text-black"
                />
                <datalist id="department-options">
                  {DEPARTMENTS.map(d => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
                <input
                  name="salary"
                  type="number"
                  step="0.01"
                  placeholder="Salary"
                  className="w-full border p-2 rounded text-black"
                  required
                />
                <select name="status" className="w-full border p-2 rounded text-black">
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
                <Button type="submit">Save</Button>
              </form>
          </DialogContent>
        </Dialog>
        <Button onClick={runPayroll} className="flex items-center gap-2">
          <Play className="h-4 w-4" /> Run Payroll
        </Button>
        <Button onClick={refreshData} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {summary?.totalEmployees || 0}
            </div>
            <p className="text-xs text-gray-600 mt-1">Total employees</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Payroll</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summary ? formatCurrency(summary.monthlyPayroll) : '$0'}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Total monthly cost
            </p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Payroll</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {summary?.nextPayroll ? formatDate(summary.nextPayroll) : 'Not scheduled'}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Scheduled date
            </p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Runs</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {summary?.pendingRuns ?? 0}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Awaiting approval
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payroll Runs */}
      <Card className="dark:bg-gray-800">
        <CardHeader>
          <CardTitle>Payroll Runs</CardTitle>
          <CardDescription>
            Recent and upcoming payroll runs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(payrollRuns?.data || []).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No payroll runs found
              </div>
            ) : (
              (payrollRuns?.data || []).map((run: PayrollRun) => (
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
      <Card className="dark:bg-gray-800">
        <CardHeader>
          <CardTitle>Employees</CardTitle>
          <CardDescription>
            Active employee roster
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(employees?.data || []).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No employees found
              </div>
            ) : (
              (employees?.data || []).map((employee: Employee) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                  onClick={() => {
                    setSelected(employee)
                    setDetailOpen(true)
                  }}
                >
                  <div className="flex-1">
                    <div className="font-medium">{employee.name}</div>
                    <div className="text-sm text-gray-600">{employee.title}</div>
                    {employee.created_at && (
                      <div className="text-xs text-gray-500">
                        {employee.department || 'General'} • Started {formatDate(employee.created_at)}
                      </div>
                    )}
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
      {selected && (
        <EmployeeDetailPanel
          employee={selected}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onUpdated={async () => {
            await Promise.all([mutEmp(), mutSum()])
          }}
        />
      )}
    </div>
  )
}
