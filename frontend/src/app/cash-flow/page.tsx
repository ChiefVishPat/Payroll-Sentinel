import DashboardLayout from '@frontend/components/layout/dashboard-layout'
import CashFlowDashboard from '@frontend/components/cash-flow/cash-flow-dashboard'

export default function CashFlowPage() {
  return (
    <DashboardLayout>
      <CashFlowDashboard />
    </DashboardLayout>
  )
}
