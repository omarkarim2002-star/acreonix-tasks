import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { DailyCheckInModal } from '@/components/ui/DailyCheckInModal'
import { OnboardingFlow } from '@/components/ui/OnboardingFlow'
import { PlanProvider } from '@/lib/plan-context'
import { TimerProvider } from '@/lib/TimerContext'
import { PostHogIdentify } from '@/components/ui/PostHogProvider'
import { PWAInstallPrompt } from '@/components/ui/PWAInstallPrompt'
import { FloatingTimer } from '@/components/ui/FloatingTimer'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlanProvider>
      <TimerProvider>
      <div className="flex h-screen overflow-hidden bg-[#f8faf9]">

        {/* Desktop sidebar */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        {/* Mobile: flex-col so header stacks above main.
            md:contents dissolves this on desktop — sidebar layout unchanged. */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden md:contents">

          <MobileNav />
          <DailyCheckInModal />
          <PostHogIdentify />
          <PWAInstallPrompt />
          <OnboardingFlow />

          <main className="flex-1 overflow-y-auto min-h-0">
            <div className="pb-24 md:pb-0">
              {children}
            </div>
          </main>

        </div>
      </div>
      <FloatingTimer />
      </TimerProvider>
    </PlanProvider>
  )
}
