import DashboardLayout from '@/components/layout/dashboard-layout'
import PayrollDashboard from '@/components/payroll/payroll-dashboard'

export default function PayrollPage() {
  return (
    <DashboardLayout>
      <PayrollDashboard />
    </DashboardLayout>
  )
}
