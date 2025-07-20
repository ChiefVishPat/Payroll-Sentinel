import { useState } from 'react'
import { Dialog, DialogContent, DialogClose } from '@frontend/components/ui/dialog'
import { Button } from '@frontend/components/ui/button'
import { api } from '@frontend/lib/api'
import { mutate } from 'swr'

interface AddFundsModalProps {
  accountId: string
  companyId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onStarted?: () => void
  onFinished?: () => void
}

export default function AddFundsModal({ accountId, companyId, open, onOpenChange, onStarted, onFinished }: AddFundsModalProps) {
  const [amount, setAmount] = useState(0)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [name, setName] = useState('Manual deposit')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (amount <= 0) {
      alert('Enter a positive amount.')
      return
    }
    setLoading(true)
    onStarted?.()
    try {
      await api.banking.addFunds(accountId, amount, companyId, name, date)
      await Promise.all([
        mutate(`/api/banking/balances?companyId=${companyId}`),
        mutate(`/api/banking/transactions?companyId=${companyId}`),
        mutate(`/api/banking/accounts?companyId=${companyId}`),
      ])
      onOpenChange(false)
    } catch (err: any) {
      alert(err?.message || 'Deposit failed')
    } finally {
      setLoading(false)
      onFinished?.()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="text-black">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Add Funds</h2>
          <DialogClose asChild>
            <Button variant="ghost" size="sm">Close</Button>
          </DialogClose>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={e => setAmount(parseFloat(e.target.value))}
            className="w-full border p-2 rounded text-black"
            placeholder="Amount"
            required
          />
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full border p-2 rounded text-black"
          />
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border p-2 rounded text-black"
            placeholder="Description"
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Adding...' : 'Add Funds'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
