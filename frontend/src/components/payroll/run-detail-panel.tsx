'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogClose } from '@frontend/components/ui/dialog'
import { Button } from '@frontend/components/ui/button'
import { api } from '@frontend/lib/api'
import { formatCurrency, formatDate } from '@frontend/lib/utils'
import { useCompany } from '@frontend/context/CompanyContext'
import type { PayrollRun } from '@frontend/types'

interface RunDetailProps {
  run: PayrollRun
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
}

/** Drawer panel showing a single payroll run and actions */
export default function RunDetailPanel({ run, open, onOpenChange, onUpdated }: RunDetailProps) {
  const { companyId } = useCompany()
  const [editMode, setEditMode] = useState(false)
  const [start, setStart] = useState(run.payPeriod)
  const [end, setEnd] = useState(run.payPeriod)
  const [payDate, setPayDate] = useState(run.scheduledDate)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setEditMode(false)
    setStart(run.payPeriod)
    setEnd(run.payPeriod)
    setPayDate(run.scheduledDate)
  }, [open, run])

  const save = async () => {
    setLoading(true)
    try {
      await api.payroll.updateRun(
        run.id,
        { payPeriodStart: start, payPeriodEnd: end, payDate },
        companyId || undefined
      )
      onUpdated()
      setEditMode(false)
    } finally {
      setLoading(false)
    }
  }

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed right-0 top-0 h-full w-full max-w-md rounded-none bg-white p-6 text-black">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Payroll Run</h2>
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
              type="date"
              value={start}
              onChange={e => setStart(e.target.value)}
              className="w-full border p-2 rounded"
              required
            />
            <input
              type="date"
              value={end}
              onChange={e => setEnd(e.target.value)}
              className="w-full border p-2 rounded"
              required
            />
            <input
              type="date"
              value={payDate}
              onChange={e => setPayDate(e.target.value)}
              className="w-full border p-2 rounded"
              required
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>Save</Button>
              <Button variant="outline" type="button" onClick={() => setEditMode(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-2">
            <div className="font-medium">Period: {run.payPeriod}</div>
            <div className="text-sm">Pay Date: {formatDate(run.scheduledDate)}</div>
            <div className="text-sm">Amount: {formatCurrency(run.totalAmount)}</div>
            <div className="text-sm">Employees: {run.employeeCount}</div>
            <div className="text-sm">Status: {run.status}</div>
            <div className="flex gap-2 mt-4 flex-wrap">
              {run.status === 'draft' && (
                <>
                  <Button size="sm" onClick={() => setEditMode(true)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={remove}>Discard</Button>
                </>
              )}
              {run.status === 'pending' && (
                <Button size="sm" onClick={approve}>Approve</Button>
              )}
              {run.status === 'approved' && (
                <>
                  <Button size="sm" onClick={process}>Process</Button>
                  <Button size="sm" variant="outline" onClick={revert}>Revert</Button>
                </>
              )}
              {run.status === 'processed' && (
                <span className="text-green-600 flex items-center">Processed</span>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
