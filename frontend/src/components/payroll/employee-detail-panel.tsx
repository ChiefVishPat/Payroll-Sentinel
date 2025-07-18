'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogClose } from '@frontend/components/ui/dialog'
import { Button } from '@frontend/components/ui/button'
import { DEPARTMENTS, TITLES } from '@frontend/lib/job-data'
import type { Employee } from '@frontend/shared/types'
import { api } from '@frontend/lib/api'
import { useCompany } from '@frontend/context/CompanyContext'

interface EmployeeDetailPanelProps {
  employee: Employee
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
}

/** Side panel for viewing and editing a single employee. */
export default function EmployeeDetailPanel({
  employee,
  open,
  onOpenChange,
  onUpdated,
}: EmployeeDetailPanelProps) {
  const { companyId } = useCompany()
  const [editMode, setEditMode] = useState(false)
  const [title, setTitle] = useState(employee.title)
  const [department, setDepartment] = useState(employee.department || '')
  const [salary, setSalary] = useState(employee.salary)
  const [status, setStatus] = useState(employee.status)
  const [loading, setLoading] = useState(false)

  // Refresh employee details when opened so the panel shows latest data
  useEffect(() => {
    if (!open || !companyId) return
    api.payroll
      .getEmployee(employee.id, companyId)
      .then(res => {
        const e = res.data.data as Employee
        setTitle(e.title)
        setDepartment(e.department || '')
        setSalary(e.salary)
        setStatus(e.status)
      })
      .catch(err => console.error('fetch employee detail failed', err))
  }, [open, employee.id, companyId])

  const save = async () => {
    console.debug(`[Payroll] UPDATE employee ${employee.name}`)
    setLoading(true)
    try {
      await api.payroll.updateEmployee(
        employee.id,
        { title, salary, status, department },
        companyId || undefined
      )
      setEditMode(false)
      onUpdated()
    } finally {
      setLoading(false)
    }
  }

  const remove = async () => {
    if (!confirm('Deactivate this employee?')) return
    console.debug(`[Payroll] DELETE employee ${employee.name}`)
    setLoading(true)
    try {
      await api.payroll.removeEmployee(employee.id, companyId || undefined)
      onUpdated()
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed right-0 top-0 left-auto translate-x-0 translate-y-0 h-full w-full max-w-md rounded-none bg-white p-6 text-black">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Employee Details</h2>
          <DialogClose asChild>
            <Button variant="ghost" size="sm">Close</Button>
          </DialogClose>
        </div>

        {editMode ? (
          <form
            onSubmit={e => {
              e.preventDefault()
              save()
            }}
            className="space-y-4"
          >
            <input
              list="title-options"
              value={title}
              placeholder="Title"
              onChange={e => setTitle(e.target.value)}
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
              value={department}
              placeholder="Department"
              onChange={e => setDepartment(e.target.value)}
              className="w-full border p-2 rounded text-black"
            />
            <datalist id="department-options">
              {DEPARTMENTS.map(d => (
                <option key={d} value={d} />
              ))}
            </datalist>
            <input
              type="number"
              step="0.01"
              value={salary}
              onChange={e => setSalary(parseFloat(e.target.value))}
              className="w-full border p-2 rounded text-black"
              required
            />
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full border p-2 rounded text-black"
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>Save</Button>
              <Button variant="outline" type="button" onClick={() => setEditMode(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">{employee.name}</h3>
            <div className="space-y-1 text-sm">
              <div>{employee.title || '-'}</div>
              <div>{employee.department || '-'}</div>
              <div>Salary: ${employee.salary.toLocaleString()}</div>
              <div>Status: {employee.status}</div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button size="sm" onClick={() => {console.debug(`[Payroll] EDIT employee ${employee.name}`); setEditMode(true) }}>Edit</Button>
              <Button size="sm" variant="destructive" onClick={remove}>Remove</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
