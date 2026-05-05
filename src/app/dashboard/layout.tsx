import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f8faf9]">

      {/* Desktop sidebar — only on md+ */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile: flex-col wrapper so header stacks above main */}
      {/* On desktop (md+), this becomes display:contents so it vanishes from flex flow */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden md:contents">

        {/* MobileNav renders header + bottom nav, both with className="md:hidden" */}
        <MobileNav />

        {/* Scrollable main */}
        <main className="flex-1 overflow-y-auto min-h-0">
          <div className="pb-24 md:pb-0">
            {children}
          </div>
        </main>

      </div>

    </div>
  )
}
