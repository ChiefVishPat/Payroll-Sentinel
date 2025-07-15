'use client'

import { useState } from 'react'
import { Button } from '@frontend/components/ui/button'
import { api } from '@frontend/lib/api'
import { Users, Upload, Download, Plus, Trash2, CheckCircle } from 'lucide-react'

interface EmployeeUploaderProps {
  onSuccess: () => void
}

interface Employee {
  id?: string
  name: string
  email: string
  position: string
  department: string
  salary: number
  status: 'active' | 'inactive'
}

export default function EmployeeUploader({ onSuccess }: EmployeeUploaderProps) {
  const [employees, setEmployees] = useState<Employee[]>([
    {
      name: '',
      email: '',
      position: '',
      department: '',
      salary: 0,
      status: 'active'
    }
  ])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const addEmployee = () => {
    setEmployees([...employees, {
      name: '',
      email: '',
      position: '',
      department: '',
      salary: 0,
      status: 'active'
    }])
  }

  const removeEmployee = (index: number) => {
    setEmployees(employees.filter((_, i) => i !== index))
  }

  const updateEmployee = (index: number, field: keyof Employee, value: any) => {
    const updated = [...employees]
    updated[index] = { ...updated[index], [field]: value }
    setEmployees(updated)
  }

  const loadSampleData = () => {
    const sampleEmployees: Employee[] = [
      {
        name: 'John Doe',
        email: 'john.doe@company.com',
        position: 'Software Engineer',
        department: 'Engineering',
        salary: 85000,
        status: 'active'
      },
      {
        name: 'Jane Smith',
        email: 'jane.smith@company.com',
        position: 'Product Manager',
        department: 'Product',
        salary: 95000,
        status: 'active'
      },
      {
        name: 'Mike Johnson',
        email: 'mike.johnson@company.com',
        position: 'UX Designer',
        department: 'Design',
        salary: 75000,
        status: 'active'
      },
      {
        name: 'Sarah Wilson',
        email: 'sarah.wilson@company.com',
        position: 'Marketing Manager',
        department: 'Marketing',
        salary: 70000,
        status: 'active'
      }
    ]
    setEmployees(sampleEmployees)
  }

  const uploadEmployees = async () => {
    setIsUploading(true)
    try {
      // Validate data
      const validEmployees = employees.filter(emp => 
        emp.name && emp.email && emp.position && emp.department && emp.salary > 0
      )

      if (validEmployees.length === 0) {
        throw new Error('Please add at least one valid employee')
      }

      // For demo purposes, simulate API call
      console.log('Uploading employees:', validEmployees)
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setUploadStatus('success')
      onSuccess()
      
    } catch (error) {
      console.error('Error uploading employees:', error)
      setUploadStatus('error')
    } finally {
      setIsUploading(false)
    }
  }

  const downloadTemplate = () => {
    const csvHeaders = 'Name,Email,Position,Department,Salary,Status\n'
    const csvContent = csvHeaders + 
      'John Doe,john@company.com,Software Engineer,Engineering,85000,2024-01-15,active\n' +
      'Jane Smith,jane@company.com,Product Manager,Product,95000,2024-02-01,active'
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'employee_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-purple-600" />
          <span className="font-medium">Employee Information</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          <Button variant="outline" size="sm" onClick={loadSampleData}>
            Load Sample Data
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {employees.map((employee, index) => (
          <div key={index} className="p-4 border rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Employee {index + 1}</h4>
              {employees.length > 1 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => removeEmployee(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Name *</label>
                <input
                  type="text"
                  value={employee.name}
                  onChange={(e) => updateEmployee(index, 'name', e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Full Name"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Email *</label>
                <input
                  type="email"
                  value={employee.email}
                  onChange={(e) => updateEmployee(index, 'email', e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="email@company.com"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Position *</label>
                <input
                  type="text"
                  value={employee.position}
                  onChange={(e) => updateEmployee(index, 'position', e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Job Title"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Department *</label>
                <select
                  value={employee.department}
                  onChange={(e) => updateEmployee(index, 'department', e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Select Department</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Product">Product</option>
                  <option value="Design">Design</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Sales">Sales</option>
                  <option value="Operations">Operations</option>
                  <option value="HR">Human Resources</option>
                  <option value="Finance">Finance</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Annual Salary *</label>
                <input
                  type="number"
                  value={employee.salary || ''}
                  onChange={(e) => updateEmployee(index, 'salary', parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="65000"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={addEmployee}>
          <Plus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
        
        <Button 
          onClick={uploadEmployees} 
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
              Upload Employees
            </>
          )}
        </Button>
      </div>

      {uploadStatus === 'success' && (
        <div className="flex items-center gap-2 p-3 bg-green-50 text-green-800 rounded-lg">
          <CheckCircle className="h-5 w-5" />
          <span className="text-sm">Employee data uploaded successfully!</span>
        </div>
      )}

      <div className="text-xs text-gray-500">
        <p>* Required fields</p>
        <p>Upload employee data to enable payroll calculations and risk assessments</p>
      </div>
    </div>
  )
}
