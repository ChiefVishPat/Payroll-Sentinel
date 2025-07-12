import DashboardLayout from '@frontend/components/layout/dashboard-layout'
import PayrollDashboard from '@frontend/components/payroll/payroll-dashboard'

export default function PayrollPage() {
  return (
    <DashboardLayout>
      <PayrollDashboard />
    </DashboardLayout>
  )
}
