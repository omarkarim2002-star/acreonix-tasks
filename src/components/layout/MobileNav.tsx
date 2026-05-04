'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { cn } from '@/lib/utils'
import { LayoutDashboard, FolderKanban, CheckSquare, Sparkles, BarChart2 } from 'lucide-react'
import { NotificationBell } from './NotificationBell'

const nav = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/extract', label: 'AI', icon: Sparkles },
  { href: '/dashboard/projects', label: 'Projects', icon: FolderKanban },
  { href: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/dashboard/insights', label: 'Insights', icon: BarChart2 },
]

export function MobileNav() {
  const path = usePathname()
  return (
    <>
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md overflow-hidden bg-[#e8f5ee] flex items-center justify-center">
            <Image src="/logo.png" alt="Acreonix" width={24} height={24} className="object-contain" />
          </div>
          <span className="text-[#1a1f2e] text-sm font-semibold tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>Acreonix</span>
          <span className="text-[10px] tracking-widest uppercase font-medium" style={{ color: '#c9a84c' }}>Tasks</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 flex">
        {nav.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? path === href : (path === href || path.startsWith(href + '/'))
          return (
            <Link key={href} href={href} className={cn('flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors', active ? 'text-[#2d7a4f]' : 'text-gray-400')}>
              <Icon size={20} />
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
