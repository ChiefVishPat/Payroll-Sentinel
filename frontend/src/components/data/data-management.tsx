'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@frontend/components/ui/card'
import { Button } from '@frontend/components/ui/button'
import { api } from '@frontend/lib/api'
import { 
  Upload, 
  Database, 
  Users, 
  CreditCard, 
  DollarSign,
  Building,
  FileSpreadsheet,
  Plus,
  Check,
  AlertCircle,
  ExternalLink
} from 'lucide-react'
import PlaidLinkComponent from './plaid-link'
import PayrollUploader from './payroll-uploader'
import EmployeeUploader from './employee-uploader'
import MockDataGenerator from './mock-data-generator'

export default function DataManagement() {
  const [activeTab, setActiveTab] = useState('connect')
  const [connectionStatus, setConnectionStatus] = useState({
    banking: false,
    payroll: false,
    employees: false
  })

  const tabs = [
    { id: 'connect', label: 'Connect Accounts', icon: CreditCard },
    { id: 'upload', label: 'Upload Data', icon: Upload },
    { id: 'mock', label: 'Generate Mock Data', icon: Database },
    { id: 'status', label: 'Data Status', icon: Building }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Management</h1>
        <p className="text-gray-600">Connect accounts, upload data, and manage your information</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'connect' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Connect Bank Accounts
                </CardTitle>
                <CardDescription>
                  Connect your business bank accounts using Plaid for automatic transaction sync
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PlaidLinkComponent onSuccess={() => setConnectionStatus(prev => ({ ...prev, banking: true }))} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Accounting Integration
                </CardTitle>
                <CardDescription>
                  Connect your accounting software for payroll and expense data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-green-100 rounded">
                        <Building className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium">QuickBooks</div>
                        <div className="text-sm text-gray-500">Not connected</div>
                      </div>
                    </div>
                    <Button size="sm" className="w-full">Connect QuickBooks</Button>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-100 rounded">
                        <Building className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">Xero</div>
                        <div className="text-sm text-gray-500">Not connected</div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="w-full">Connect Xero</Button>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-purple-100 rounded">
                        <Building className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <div className="font-medium">NetSuite</div>
                        <div className="text-sm text-gray-500">Not connected</div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="w-full">Connect NetSuite</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Employee Data
                </CardTitle>
                <CardDescription>
                  Upload employee information, salaries, and organizational data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmployeeUploader onSuccess={() => setConnectionStatus(prev => ({ ...prev, employees: true }))} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Payroll Data
                </CardTitle>
                <CardDescription>
                  Upload historical payroll runs and configure upcoming payroll schedules
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PayrollUploader onSuccess={() => setConnectionStatus(prev => ({ ...prev, payroll: true }))} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Bulk Data Upload
                </CardTitle>
                <CardDescription>
                  Upload CSV files with transaction history, employee records, or other bulk data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <div className="text-sm text-gray-600 mb-2">Transaction History CSV</div>
                      <input type="file" accept=".csv" className="hidden" id="transactions-upload" />
                      <label htmlFor="transactions-upload">
                        <Button size="sm" variant="outline" className="cursor-pointer">
                          Choose File
                        </Button>
                      </label>
                    </div>
                    
                    <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <div className="text-sm text-gray-600 mb-2">Employee Directory CSV</div>
                      <input type="file" accept=".csv" className="hidden" id="employees-upload" />
                      <label htmlFor="employees-upload">
                        <Button size="sm" variant="outline" className="cursor-pointer">
                          Choose File
                        </Button>
                      </label>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    <p>Supported formats: CSV files with proper headers</p>
                    <p>Maximum file size: 10MB</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'mock' && (
          <div className="space-y-6">
            <MockDataGenerator />
          </div>
        )}

        {activeTab === 'status' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Connection Status</CardTitle>
                <CardDescription>
                  Overview of your connected accounts and data sources
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="font-medium">Bank Accounts</div>
                        <div className="text-sm text-gray-600">3 accounts connected</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600">Connected</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-purple-600" />
                      <div>
                        <div className="font-medium">Employee Data</div>
                        <div className="text-sm text-gray-600">12 employees loaded</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600">Loaded</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="font-medium">Payroll History</div>
                        <div className="text-sm text-gray-600">6 months of data</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600">Available</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <Building className="h-5 w-5 text-orange-600" />
                      <div>
                        <div className="font-medium">Accounting Software</div>
                        <div className="text-sm text-gray-600">QuickBooks integration</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      <span className="text-sm text-orange-600">Pending</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <ExternalLink className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-blue-900">Next Steps</div>
                      <div className="text-sm text-blue-700 mt-1">
                        Your system is ready for risk analysis. Consider connecting your accounting software for automated payroll sync.
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
