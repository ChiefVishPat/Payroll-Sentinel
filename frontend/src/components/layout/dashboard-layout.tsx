'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  BarChart3, 
  DollarSign, 
  Users, 
  Settings, 
  Bell, 
  Menu, 
  X,
  Shield,
  Activity,
  CreditCard,
  Database
} from 'lucide-react'
import { cn } from '@frontend/lib/utils'

interface DashboardLayoutProps {
  children: ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3 },
  { name: 'Risk Analysis', href: '/risk', icon: Shield },
  { name: 'Cash Flow', href: '/cash-flow', icon: DollarSign },
  { name: 'Payroll', href: '/payroll', icon: Users },
  { name: 'Banking', href: '/banking', icon: CreditCard },
  { name: 'Data Management', href: '/data', icon: Database },
  { name: 'Monitoring', href: '/monitoring', icon: Activity },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="flex h-screen bg-[#1D1D1D] text-[#EAEAEA]">
      {/* Mobile sidebar */}
      <div className={cn(
        "fixed inset-0 z-40 lg:hidden",
        sidebarOpen ? "block" : "hidden"
      )}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex w-full max-w-xs flex-col bg-[#2C2C2C]">
          <div className="absolute right-0 top-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <Sidebar />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col bg-[#2C2C2C]">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:pl-64">
        <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-[#2C2C2C] shadow">
          <button
            type="button"
            className="border-r border-[#444444] px-4 text-[#B0B0B0] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#0077FF] lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex flex-1 justify-between px-4">
            <div className="flex flex-1">
              <div className="flex w-full md:ml-0">
                <div className="relative w-full text-[#B0B0B0] focus-within:text-[#EAEAEA]">
                  <h1 className="text-xl font-semibold text-[#EAEAEA] py-4">
                    Payroll Sentinel
                  </h1>
                </div>
              </div>
            </div>
            <div className="ml-4 flex items-center md:ml-6">
              <button
                type="button"
                className="rounded-full bg-[#2C2C2C] p-1 text-[#B0B0B0] hover:text-[#EAEAEA] focus:outline-none focus:ring-2 focus:ring-[#0077FF] focus:ring-offset-2"
              >
                <Bell className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )

  function Sidebar() {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-[#2C2C2C]">
        <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
          <div className="flex flex-shrink-0 items-center px-4">
            <Shield className="h-8 w-8 text-[#0077FF]" />
            <span className="ml-2 text-xl font-semibold text-[#EAEAEA]">
              Payroll Sentinel
            </span>
          </div>
          <nav className="mt-5 flex-1 space-y-1 px-2" aria-label="Sidebar">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    isActive
                      ? 'bg-[#0077FF]/20 text-[#0077FF]'
                      : 'text-[#B0B0B0] hover:bg-[#2C2C2C] hover:text-[#EAEAEA]',
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                  )}
                >
                  <item.icon
                    className={cn(
                      isActive ? 'text-[#0077FF]' : 'text-[#B0B0B0] group-hover:text-[#EAEAEA]',
                      'mr-3 h-6 w-6'
                    )}
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    )
  }
}
