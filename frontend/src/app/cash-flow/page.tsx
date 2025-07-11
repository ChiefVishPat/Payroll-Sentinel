import DashboardLayout from '@/components/layout/dashboard-layout'
import CashFlowDashboard from '@/components/cash-flow/cash-flow-dashboard'

export default function CashFlowPage() {
  return (
    <DashboardLayout>
      <CashFlowDashboard />
    </DashboardLayout>
  )
}
