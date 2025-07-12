import DashboardLayout from '@frontend/components/layout/dashboard-layout'
import BankingDashboard from '@frontend/components/banking/banking-dashboard'

export default function BankingPage() {
  return (
    <DashboardLayout>
      <BankingDashboard />
    </DashboardLayout>
  )
}
