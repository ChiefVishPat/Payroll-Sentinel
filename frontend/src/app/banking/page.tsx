import DashboardLayout from '@/components/layout/dashboard-layout'
import BankingDashboard from '@/components/banking/banking-dashboard'

export default function BankingPage() {
  return (
    <DashboardLayout>
      <BankingDashboard />
    </DashboardLayout>
  )
}
