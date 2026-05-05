import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f8faf9]">

      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile: flex-col so header stacks above main.
          md:contents dissolves this on desktop — sidebar layout unchanged. */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden md:contents">

        <MobileNav />

        <main className="flex-1 overflow-y-auto min-h-0">
          <div className="pb-24 md:pb-0">
            {children}
          </div>
        </main>

      </div>
    </div>
  )
}
