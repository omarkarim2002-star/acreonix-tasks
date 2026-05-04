import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { PlanProvider } from '@/lib/plan-context'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlanProvider>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f4f6f8' }}>
        <div className="hidden md:flex">
          <Sidebar />
        </div>
        <MobileNav />
        <main style={{ flex: 1, overflow: 'auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, paddingBottom: 80 }} className="md:pb-0">
            {children}
          </div>
        </main>
      </div>
    </PlanProvider>
  )
}
