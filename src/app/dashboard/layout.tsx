'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { PlanProvider } from '@/lib/plan-context'
import { ToastProvider } from '@/components/ui/Toast'
import { OnboardingFlow } from '@/components/ui/OnboardingFlow'
import { FloatingTimer } from '@/components/ui/FloatingTimer'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    const done = localStorage.getItem('acreonix_onboarded')
    if (!done) setShowOnboarding(true)
  }, [])

  return (
    <PlanProvider>
      <ToastProvider>
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f7f7f5' }}>
          <div className="hidden md:flex">
            <Sidebar />
          </div>
          <MobileNav />
          <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
            <div style={{ paddingBottom: 80 }} className="md:pb-0">
              {children}
            </div>
          </main>
        </div>

        {/* Floating timer — always visible across all pages */}
        <FloatingTimer />

        {showOnboarding && <OnboardingFlow onComplete={() => setShowOnboarding(false)} />}
      </ToastProvider>
    </PlanProvider>
  )
}
