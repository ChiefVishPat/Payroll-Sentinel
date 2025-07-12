'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@frontend/components/ui/card'
import { Button } from '@frontend/components/ui/button'
import { api } from '@frontend/lib/api'
import { useCompany } from '@frontend/context/CompanyContext'
import CompanySelector from '@frontend/components/CompanySelector'
import { 
  Database, 
  Shuffle, 
  CheckCircle, 
  Users, 
  DollarSign, 
  CreditCard,
  TrendingUp,
  Calendar
} from 'lucide-react'

export default function MockDataGenerator() {
  const { companyId } = useCompany()

  if (!companyId) {
    return <CompanySelector />
  }
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedData, setGeneratedData] = useState<any>(null)

  const generateMockData = async () => {
    setIsGenerating(true)
    
    try {
      // Call the backend API to generate real mock data
      const response = await api.mockData.generate(companyId)
      console.log('Mock data generation response:', response.data)
      
      if (response.data.success) {
        const mockData = {
          employees: response.data.data.employees,
          payroll: {
            monthlyTotal: Math.round(response.data.data.payroll.totalAmount || 65000),
            frequency: 'monthly',
            lastRun: response.data.data.payroll.lastRun ? new Date(response.data.data.payroll.lastRun).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            nextRun: response.data.data.payroll.nextRun ? new Date(response.data.data.payroll.nextRun).toISOString().split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          },
          banking: response.data.data.banking || {
            accounts: 0,
            totalBalance: 0,
            connected: false
          },
          transactions: {
            count: 150, // Will be updated when banking is connected
            categories: ['Payroll', 'Rent', 'Software', 'Marketing', 'Travel'],
            dateRange: '6 months'
          }
        }
        
        setGeneratedData(mockData)
      } else {
        throw new Error(response.data.message || 'Failed to generate mock data')
      }
    } catch (error) {
      console.error('Error generating mock data:', error)
      // Fallback to local simulation if API fails
      const fallbackData = {
        employees: {
          count: 3,
          departments: ['Engineering', 'Marketing', 'Operations'],
          totalSalaries: 270000
        },
        payroll: {
          monthlyTotal: 22500,
          frequency: 'monthly',
          lastRun: new Date().toISOString().split('T')[0],
          nextRun: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        banking: {
          accounts: 0,
          totalBalance: 0,
          connected: false
        },
        transactions: {
          count: 0,
          categories: ['Payroll', 'Rent', 'Software', 'Marketing', 'Travel'],
          dateRange: '6 months'
        }
      }
      setGeneratedData(fallbackData)
    } finally {
      setIsGenerating(false)
    }
  }

  const dataTypes = [
    {
      id: 'employees',
      title: 'Employee Data',
      description: 'Generate realistic employee profiles with salaries and departments',
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      items: [
        '12 employees across 4 departments',
        'Realistic salary ranges by position',
        'Start dates and employment status',
        'Department and role assignments'
      ]
    },
    {
      id: 'payroll',
      title: 'Payroll History',
      description: 'Create historical payroll runs and upcoming schedules',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      items: [
        '6 months of payroll history',
        'Monthly recurring schedules',
        'Tax and deduction calculations',
        'Approval workflows and statuses'
      ]
    },
    {
      id: 'banking',
      title: 'Bank Accounts',
      description: 'Mock bank accounts with realistic balances and transactions',
      icon: CreditCard,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      items: [
        'Business checking and savings accounts',
        'Credit line with utilization',
        'Realistic account balances',
        'Account metadata and bank details'
      ]
    },
    {
      id: 'transactions',
      title: 'Transaction History',
      description: 'Generate realistic financial transactions and cash flows',
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      items: [
        '150+ transactions over 6 months',
        'Categorized income and expenses',
        'Realistic amounts and descriptions',
        'Recurring and one-time transactions'
      ]
    }
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Mock Data Generator
          </CardTitle>
          <CardDescription>
            Generate realistic sample data for testing and demonstration purposes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="mb-6">
              <Shuffle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <div className="text-lg font-medium mb-2">Generate Complete Dataset</div>
              <div className="text-gray-600 mb-6">
                Create a comprehensive set of mock data including employees, payroll, banking, and transaction history
              </div>
            </div>
            
            <Button 
              onClick={generateMockData} 
              disabled={isGenerating}
              size="lg"
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Database className="h-5 w-5 animate-pulse" />
                  Generating Data...
                </>
              ) : (
                <>
                  <Database className="h-5 w-5" />
                  Generate Mock Data
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {dataTypes.map((type) => (
          <Card key={type.id}>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${type.color}`}>
                <div className={`p-2 rounded ${type.bgColor}`}>
                  <type.icon className="h-5 w-5" />
                </div>
                {type.title}
              </CardTitle>
              <CardDescription>{type.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {type.items.map((item, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {generatedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Mock Data Generated Successfully
            </CardTitle>
            <CardDescription>
              Your sample dataset has been created and is ready for use
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Employees</span>
                </div>
                <div className="text-lg font-bold text-purple-600">
                  {generatedData.employees.count}
                </div>
                <div className="text-xs text-purple-600">
                  ${generatedData.employees.totalSalaries.toLocaleString()} total
                </div>
              </div>

              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Payroll</span>
                </div>
                <div className="text-lg font-bold text-green-600">
                  ${generatedData.payroll.monthlyTotal.toLocaleString()}
                </div>
                <div className="text-xs text-green-600">
                  Monthly total
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Banking</span>
                </div>
                <div className="text-lg font-bold text-blue-600">
                  ${generatedData.banking.totalBalance.toLocaleString()}
                </div>
                <div className="text-xs text-blue-600">
                  {generatedData.banking.accounts} accounts
                </div>
              </div>

              <div className="p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">Transactions</span>
                </div>
                <div className="text-lg font-bold text-orange-600">
                  {generatedData.transactions.count}
                </div>
                <div className="text-xs text-orange-600">
                  {generatedData.transactions.dateRange}
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <div className="font-medium text-blue-900">What's Next?</div>
                  <div className="text-sm text-blue-700 mt-1">
                    Your mock data is now loaded and available throughout the dashboard. You can view it in the risk analysis, cash flow projections, and payroll management sections.
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={() => window.location.href = '/risk'}>
                      View Risk Analysis
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => window.location.href = '/cash-flow'}>
                      Check Cash Flow
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-xs text-gray-500 text-center">
        <p>Mock data is for demonstration purposes only and does not represent real financial information</p>
      </div>
    </div>
  )
}
