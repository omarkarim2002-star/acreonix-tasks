import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--surface)' }}>
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      <MobileNav />
      <main className="flex-1 overflow-y-auto">
        <div className="pb-20 md:pb-0 min-h-full">
          {children}
        </div>
      </main>
    </div>
  )
}
