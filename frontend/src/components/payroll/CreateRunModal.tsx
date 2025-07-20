'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Dialog, DialogContent, DialogClose } from '@frontend/components/ui/dialog'
import { Button } from '@frontend/components/ui/button'
import { api, apiClient } from '@frontend/lib/api'
import { useCompany } from '@frontend/context/CompanyContext'
import type { Employee } from '@frontend/types'
import { Loader } from 'lucide-react'

interface CreateRunModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

const fetcher = (url: string) => apiClient.get(url).then(res => res.data)

/** Modal form for creating a new payroll run. */
export default function CreateRunModal({ open, onOpenChange, onSaved }: CreateRunModalProps) {
  const { companyId } = useCompany()

  const { data: employees } = useSWR(
    open && companyId ? `/api/payroll/employees?companyId=${companyId}` : null,
    fetcher
  )

  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [payDate, setPayDate] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [gross, setGross] = useState('')
  const [loading, setLoading] = useState(false)

  // Initialize fields when modal opens
  useEffect(() => {
    if (!open) return
    if (employees) {
      setSelected(employees.data.map((e: Employee) => e.id))
    }
    setStart('')
    setEnd('')
    setPayDate('')
    setGross('')
  }, [open, employees])

  const toggle = (id: string) => {
    setSelected(prev => (prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]))
  }
  const selectAll = () => {
    if (employees) setSelected(employees.data.map((e: Employee) => e.id))
  }
  const deselectAll = () => setSelected([])

  const submit = async (draft: boolean) => {
    if (!companyId) return
    setLoading(true)
    try {
      await api.payroll.createRun({
        companyId,
        payPeriodStart: start,
        payPeriodEnd: end,
        payDate,
        employeeIds: selected,
        totalGross: Number(gross) || 0,
        draft,
      })
      onSaved()
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="text-black">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">New Payroll Run</h2>
          <DialogClose asChild>
            <Button variant="ghost" size="sm">Close</Button>
          </DialogClose>
        </div>
        <form
          onSubmit={e => {
            e.preventDefault()
            submit(true)
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="start" className="block text-sm font-medium mb-1">
              Period Start
            </label>
            <input
              id="start"
              type="date"
              value={start}
              onChange={e => setStart(e.target.value)}
              className="w-full border p-2 rounded"
              required
            />
          </div>
          <div>
            <label htmlFor="end" className="block text-sm font-medium mb-1">
              Period End
            </label>
            <input
              id="end"
              type="date"
              value={end}
              onChange={e => setEnd(e.target.value)}
              className="w-full border p-2 rounded"
              required
            />
          </div>
          <div>
            <label htmlFor="payDate" className="block text-sm font-medium mb-1">
              Pay Date
            </label>
            <input
              id="payDate"
              type="date"
              value={payDate}
              onChange={e => setPayDate(e.target.value)}
              className="w-full border p-2 rounded"
              required
            />
          </div>
          <div>
            <label htmlFor="gross" className="block text-sm font-medium mb-1">
              Gross Amount
            </label>
            <input
              id="gross"
              type="number"
              step="0.01"
              value={gross}
              onChange={e => setGross(e.target.value)}
              className="w-full border p-2 rounded"
              required
            />
          </div>
          {employees && (
            <div className="border p-2 rounded max-h-40 overflow-auto space-y-1">
              <div className="flex justify-between mb-2 text-sm">
                <button type="button" onClick={selectAll}>Select all</button>
                <button type="button" onClick={deselectAll}>Deselect all</button>
              </div>
              {employees.data.map((emp: Employee) => (
                <label key={emp.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.includes(emp.id)}
                    onChange={() => toggle(emp.id)}
                  />
                  {emp.name}
                </label>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Button type="button" disabled={loading} onClick={() => submit(true)}>
              {loading ? <Loader className="animate-spin" /> : 'Save Draft'}
            </Button>
            <Button type="button" disabled={loading} onClick={() => submit(false)}>
              {loading ? <Loader className="animate-spin" /> : 'Submit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
