'use client'
import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { PlanProvider } from '@/lib/plan-context'
import { ToastProvider } from '@/components/ui/Toast'
import { OnboardingFlow } from '@/components/ui/OnboardingFlow'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    // Show onboarding only if not completed and this looks like first visit
    const done = localStorage.getItem('acreonix_onboarded')
    if (!done) setShowOnboarding(true)
  }, [])

  return (
    <PlanProvider>
      <ToastProvider>
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
        {showOnboarding && <OnboardingFlow onComplete={() => setShowOnboarding(false)} />}
      </ToastProvider>
    </PlanProvider>
  )
}
