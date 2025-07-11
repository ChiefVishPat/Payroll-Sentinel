'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DollarSign, Upload, Calendar, CheckCircle, Plus } from 'lucide-react'

interface PayrollUploaderProps {
  onSuccess: () => void
}

interface PayrollRun {
  payPeriodStart: string
  payPeriodEnd: string
  payDate: string
  totalAmount: number
  employeeCount: number
  status: 'draft' | 'pending' | 'processed'
}

export default function PayrollUploader({ onSuccess }: PayrollUploaderProps) {
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([
    {
      payPeriodStart: '',
      payPeriodEnd: '',
      payDate: '',
      totalAmount: 0,
      employeeCount: 0,
      status: 'draft'
    }
  ])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const addPayrollRun = () => {
    setPayrollRuns([...payrollRuns, {
      payPeriodStart: '',
      payPeriodEnd: '',
      payDate: '',
      totalAmount: 0,
      employeeCount: 0,
      status: 'draft'
    }])
  }

  const updatePayrollRun = (index: number, field: keyof PayrollRun, value: any) => {
    const updated = [...payrollRuns]
    updated[index] = { ...updated[index], [field]: value }
    setPayrollRuns(updated)
  }

  const loadSampleData = () => {
    const currentDate = new Date()
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    const thisMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)

    const sampleRuns: PayrollRun[] = [
      {
        payPeriodStart: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1).toISOString().split('T')[0],
        payPeriodEnd: new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).toISOString().split('T')[0],
        payDate: new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1).toISOString().split('T')[0],
        totalAmount: 62000,
        employeeCount: 12,
        status: 'processed'
      },
      {
        payPeriodStart: new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1).toISOString().split('T')[0],
        payPeriodEnd: new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 0).toISOString().split('T')[0],
        payDate: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1).toISOString().split('T')[0],
        totalAmount: 65000,
        employeeCount: 12,
        status: 'pending'
      }
    ]
    setPayrollRuns(sampleRuns)
  }

  const uploadPayroll = async () => {
    setIsUploading(true)
    try {
      const validRuns = payrollRuns.filter(run => 
        run.payPeriodStart && run.payPeriodEnd && run.payDate && run.totalAmount > 0
      )

      if (validRuns.length === 0) {
        throw new Error('Please add at least one valid payroll run')
      }

      console.log('Uploading payroll runs:', validRuns)
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setUploadStatus('success')
      onSuccess()
      
    } catch (error) {
      console.error('Error uploading payroll:', error)
      setUploadStatus('error')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          <span className="font-medium">Payroll Information</span>
        </div>
        <Button variant="outline" size="sm" onClick={loadSampleData}>
          Load Sample Data
        </Button>
      </div>

      <div className="space-y-4">
        {payrollRuns.map((run, index) => (
          <div key={index} className="p-4 border rounded-lg space-y-3">
            <h4 className="font-medium">Payroll Run {index + 1}</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Pay Period Start *</label>
                <input
                  type="date"
                  value={run.payPeriodStart}
                  onChange={(e) => updatePayrollRun(index, 'payPeriodStart', e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Pay Period End *</label>
                <input
                  type="date"
                  value={run.payPeriodEnd}
                  onChange={(e) => updatePayrollRun(index, 'payPeriodEnd', e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Pay Date *</label>
                <input
                  type="date"
                  value={run.payDate}
                  onChange={(e) => updatePayrollRun(index, 'payDate', e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Total Amount *</label>
                <input
                  type="number"
                  value={run.totalAmount || ''}
                  onChange={(e) => updatePayrollRun(index, 'totalAmount', parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="65000"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Employee Count</label>
                <input
                  type="number"
                  value={run.employeeCount || ''}
                  onChange={(e) => updatePayrollRun(index, 'employeeCount', parseInt(e.target.value) || 0)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="12"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Status</label>
                <select
                  value={run.status}
                  onChange={(e) => updatePayrollRun(index, 'status', e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="processed">Processed</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={addPayrollRun}>
          <Plus className="h-4 w-4 mr-2" />
          Add Payroll Run
        </Button>
        
        <Button 
          onClick={uploadPayroll} 
          disabled={isUploading}
          className="flex items-center gap-2"
        >
          {isUploading ? (
            <>
              <Upload className="h-4 w-4 animate-pulse" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload Payroll Data
            </>
          )}
        </Button>
      </div>

      {uploadStatus === 'success' && (
        <div className="flex items-center gap-2 p-3 bg-green-50 text-green-800 rounded-lg">
          <CheckCircle className="h-5 w-5" />
          <span className="text-sm">Payroll data uploaded successfully!</span>
        </div>
      )}

      <div className="text-xs text-gray-500">
        <p>* Required fields</p>
        <p>Upload historical payroll data to improve cash flow projections and risk analysis</p>
      </div>
    </div>
  )
}
