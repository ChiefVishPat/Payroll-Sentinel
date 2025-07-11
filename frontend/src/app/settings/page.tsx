import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Database, 
  Key,
  Mail,
  Slack,
  DollarSign
} from 'lucide-react'

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your account and system preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Company Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Company Profile
              </CardTitle>
              <CardDescription>
                Basic company information and settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Company Name</label>
                <input 
                  type="text" 
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                  defaultValue="Demo Company"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Industry</label>
                <select className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md">
                  <option>Technology</option>
                  <option>Finance</option>
                  <option>Healthcare</option>
                  <option>Retail</option>
                  <option>Manufacturing</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Company Size</label>
                <select className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md">
                  <option>1-10 employees</option>
                  <option>11-50 employees</option>
                  <option>51-200 employees</option>
                  <option>201-500 employees</option>
                  <option>500+ employees</option>
                </select>
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Configure how you receive alerts and updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Email Notifications</div>
                  <div className="text-sm text-gray-600">Receive alerts via email</div>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Slack Notifications</div>
                  <div className="text-sm text-gray-600">Send alerts to Slack</div>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Risk Alerts</div>
                  <div className="text-sm text-gray-600">High priority risk notifications</div>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Payroll Reminders</div>
                  <div className="text-sm text-gray-600">Upcoming payroll notifications</div>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4" />
              </div>
              <Button>Update Preferences</Button>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security & Privacy
              </CardTitle>
              <CardDescription>
                Manage security settings and access controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Two-Factor Authentication</div>
                  <div className="text-sm text-gray-600">Add extra security to your account</div>
                </div>
                <Button variant="outline" size="sm">Enable</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">API Keys</div>
                  <div className="text-sm text-gray-600">Manage integration API keys</div>
                </div>
                <Button variant="outline" size="sm">Manage</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Data Export</div>
                  <div className="text-sm text-gray-600">Download your data</div>
                </div>
                <Button variant="outline" size="sm">Export</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Session Management</div>
                  <div className="text-sm text-gray-600">View active sessions</div>
                </div>
                <Button variant="outline" size="sm">View</Button>
              </div>
            </CardContent>
          </Card>

          {/* Integration Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Integrations
              </CardTitle>
              <CardDescription>
                Connect and manage external services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-6 w-6 text-green-600" />
                  <div>
                    <div className="font-medium">Plaid Banking</div>
                    <div className="text-sm text-gray-600">Connected • 3 accounts</div>
                  </div>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  <Slack className="h-6 w-6 text-purple-600" />
                  <div>
                    <div className="font-medium">Slack</div>
                    <div className="text-sm text-gray-600">Connected • #alerts channel</div>
                  </div>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  <Mail className="h-6 w-6 text-blue-600" />
                  <div>
                    <div className="font-medium">Email Service</div>
                    <div className="text-sm text-gray-600">Configured • SMTP</div>
                  </div>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>

              <div className="flex items-center justify-between p-3 border rounded border-dashed">
                <div className="flex items-center gap-3">
                  <Key className="h-6 w-6 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-600">QuickBooks</div>
                    <div className="text-sm text-gray-500">Not connected</div>
                  </div>
                </div>
                <Button size="sm">Connect</Button>
              </div>
            </CardContent>
          </Card>

          {/* Risk Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Risk Thresholds
              </CardTitle>
              <CardDescription>
                Configure risk assessment parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Cash Flow Warning Threshold</label>
                <div className="flex items-center gap-2 mt-1">
                  <input 
                    type="number" 
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    defaultValue="30"
                  />
                  <span className="text-sm text-gray-600">days</span>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Critical Balance Threshold</label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-600">$</span>
                  <input 
                    type="number" 
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    defaultValue="50000"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Payroll Buffer</label>
                <div className="flex items-center gap-2 mt-1">
                  <input 
                    type="number" 
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    defaultValue="1.5"
                    step="0.1"
                  />
                  <span className="text-sm text-gray-600">× monthly payroll</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Auto Risk Assessment</div>
                  <div className="text-sm text-gray-600">Run assessments automatically</div>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4" />
              </div>
              
              <Button>Update Thresholds</Button>
            </CardContent>
          </Card>

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                System Information
              </CardTitle>
              <CardDescription>
                Current system status and version information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Version</span>
                <span className="text-sm text-gray-600">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Last Updated</span>
                <span className="text-sm text-gray-600">January 9, 2025</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Database Status</span>
                <span className="text-sm text-green-600">Connected</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">API Status</span>
                <span className="text-sm text-green-600">Healthy</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Uptime</span>
                <span className="text-sm text-gray-600">99.9%</span>
              </div>
              <div className="pt-2">
                <Button variant="outline" className="w-full">View System Logs</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
