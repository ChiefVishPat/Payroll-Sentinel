'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogClose } from '@frontend/components/ui/dialog'
import { Button } from '@frontend/components/ui/button'
import { api } from '@frontend/lib/api'
import { Loader } from 'lucide-react'
import type { PayrollRun } from '@frontend/types'

interface EditRunModalProps {
  run: PayrollRun
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

/** Modal for editing an existing payroll run. */
export default function EditRunModal({ run, open, onOpenChange, onSaved }: EditRunModalProps) {
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [payDate, setPayDate] = useState('')
  const [gross, setGross] = useState('')
  const [loading, setLoading] = useState(false)

  // Populate form when modal opens
  useEffect(() => {
    if (!open) return
    const r: any = run
    setStart(r.pay_period_start ?? r.payPeriodStart ?? '')
    setEnd(r.pay_period_end ?? r.payPeriodEnd ?? '')
    setPayDate(r.pay_date ?? r.payDate ?? '')
    setGross(String(r.total_gross ?? r.totalAmount ?? 0))
  }, [open, run])

  const submit = async () => {
    setLoading(true)
    try {
      await api.payroll.updateRun(run.id, {
        payPeriodStart: start,
        payPeriodEnd: end,
        payDate,
        totalGross: Number(gross) || 0,
      }, run.company_id)
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
          <h2 className="text-lg font-semibold">Edit Payroll Run</h2>
          <DialogClose asChild>
            <Button variant="ghost" size="sm">Close</Button>
          </DialogClose>
        </div>
        <form
          onSubmit={e => {
            e.preventDefault()
            submit()
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
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? <Loader className="animate-spin" /> : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
