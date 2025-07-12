import DashboardLayout from '@frontend/components/layout/dashboard-layout'
import DashboardStatsCards from '@frontend/components/dashboard/dashboard-stats'

export default function Home() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome to Payroll Sentinel</p>
        </div>
        <DashboardStatsCards />
      </div>
    </DashboardLayout>
  );
}
