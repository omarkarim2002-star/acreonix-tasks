import { Sidebar } from '@/components/layout/Sidebar'
import { MobileHeader } from '@/components/layout/MobileNav'
import { PlanProvider } from '@/lib/plan-context'
import { ToastProvider } from '@/components/ui/Toast'
import { OnboardingWrapper } from '@/components/ui/OnboardingWrapper'
import { FloatingTimer } from '@/components/ui/FloatingTimer'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlanProvider>
      <ToastProvider>
        <div style={{
          display: 'flex',
          height: '100vh',
          overflow: 'hidden',
          background: '#f7f7f5',
        }}>
          {/* Sidebar — always visible on md+ */}
          <Sidebar />

          {/* Main content area */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            overflow: 'hidden',
          }}>
            {/* Mobile header — only shows on mobile via CSS */}
            <MobileHeader />

            {/* Scrollable page content */}
            <main style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
            }}>
              {children}
            </main>
          </div>
        </div>

        <FloatingTimer />
        <OnboardingWrapper />
      </ToastProvider>
    </PlanProvider>
  )
}
