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
      <header
        className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-30"
        style={{ background: '#fff', borderBottom: '1px solid #e8edf2' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md overflow-hidden flex items-center justify-center" style={{ background: '#e8f4ee' }}>
            <Image src="/logo.png" alt="Acreonix" width={22} height={22} className="object-contain" />
          </div>
          <span
            className="text-sm font-semibold"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif', color: '#141b2d' }}
          >
            Acreonix
          </span>
          <span className="text-[9px] tracking-[0.18em] uppercase font-medium" style={{ color: '#c9a84c' }}>
            Tasks
          </span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex"
        style={{ background: '#fff', borderTop: '1px solid #e8edf2' }}
      >
        {nav.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? path === href : (path === href || path.startsWith(href + '/'))
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors"
              style={{ color: active ? '#2d7a4f' : '#9aa3b4' }}
            >
              <Icon size={19} />
              <span style={{ fontSize: 10, fontWeight: 500 }}>{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
