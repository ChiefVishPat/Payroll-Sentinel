'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogClose } from '@frontend/components/ui/dialog'
import { Button } from '@frontend/components/ui/button'
import { api } from '@frontend/lib/api'
import { formatCurrency, formatDate } from '@frontend/lib/utils'
import { Loader } from 'lucide-react'
import { useCompany } from '@frontend/context/CompanyContext'
import type { PayrollRun } from '@frontend/types'
import RunModal from './RunModal'

interface RunDetailProps {
  run: PayrollRun
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
}

/** Drawer panel showing a single payroll run and actions */
export default function RunDrawer({ run, open, onOpenChange, onUpdated }: RunDetailProps) {
  const { companyId } = useCompany()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)

  const remove = async () => {
    if (!confirm('Discard this run?')) return
    setLoading(true)
    try {
      await api.payroll.deleteRun(run.id, companyId || undefined)
      onUpdated()
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  const approve = async () => {
    setLoading(true)
    try {
      await api.payroll.approveRun(run.id, companyId || undefined)
      onUpdated()
    } finally {
      setLoading(false)
    }
  }

  const revert = async () => {
    setLoading(true)
    try {
      await api.payroll.revertRun(run.id, companyId || undefined)
      onUpdated()
    } finally {
      setLoading(false)
    }
  }

  const process = async () => {
    setLoading(true)
    try {
      await api.payroll.processRun(run.id, companyId || undefined)
      onUpdated()
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed right-0 top-0 h-full w-full max-w-md rounded-none bg-white p-6 text-black">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Payroll Run</h2>
          <DialogClose asChild>
            <Button variant="ghost" size="sm">Close</Button>
          </DialogClose>
        </div>

        <div className="space-y-2">
            {(() => {
              const r: any = run
              const start = r.pay_period_start ?? r.payPeriodStart
              const end = r.pay_period_end ?? r.payPeriodEnd
              const payDate = r.pay_date ?? r.payDate
              const gross = r.total_gross ?? r.totalAmount
              return (
                <>
                  <div className="font-medium">Period: {start} to {end}</div>
                  <div className="text-sm">Pay Date: {formatDate(payDate)}</div>
                  <div className="text-sm">Amount: {formatCurrency(gross)}</div>
                </>
              )
            })()}
            <div className="text-sm">Employees: {run.employee_count}</div>
            <div className="text-sm">Status: {run.status}</div>
            <div className="flex gap-2 mt-4 flex-wrap">
              {['draft', 'pending'].includes(run.status) && (
                <>
                  <Button
                    size="sm"
                    onClick={() => {
                      // Close drawer so the edit modal is unobstructed
                      setEditing(true)
                      onOpenChange(false)
                    }}
                    disabled={loading}
                  >
                    {loading ? <Loader className="h-4 w-4 animate-spin" /> : 'Edit'}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={remove} disabled={loading}>
                    {loading ? <Loader className="h-4 w-4 animate-spin" /> : 'Delete'}
                  </Button>
                </>
              )}
              {run.status === 'pending' && (
                <Button size="sm" onClick={approve} disabled={loading}>
                  {loading ? <Loader className="h-4 w-4 animate-spin" /> : 'Approve'}
                </Button>
              )}
              {run.status === 'approved' && (
                <>
                  <Button size="sm" onClick={process} disabled={loading}>
                    {loading ? <Loader className="h-4 w-4 animate-spin" /> : 'Process'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={revert} disabled={loading}>
                    {loading ? <Loader className="h-4 w-4 animate-spin" /> : 'Revert'}
                  </Button>
                </>
              )}
              {run.status === 'processed' && (
                <span className="text-green-600 flex items-center">Processed</span>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <RunModal
        open={editing}
        onOpenChange={setEditing}
        onSaved={onUpdated}
        run={run}
      />
    </>
  )
}
