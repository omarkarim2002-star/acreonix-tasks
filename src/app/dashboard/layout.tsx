import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f8faf9]">
      {/* Sidebar — hidden on mobile */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile top + bottom nav */}
      <MobileNav />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Desktop padding, mobile also accounts for bottom nav */}
        <div className="pb-24 md:pb-0">
          {children}
        </div>
      </main>
    </div>
  )
}
