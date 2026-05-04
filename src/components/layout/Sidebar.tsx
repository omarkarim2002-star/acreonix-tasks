'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { cn } from '@/lib/utils'
import {
  FolderKanban, CheckSquare, Sparkles,
  Calendar, GitFork, BarChart2, Timer,
} from 'lucide-react'
import { NotificationBell } from './NotificationBell'

const nav = [
  { href: '/dashboard/extract', label: 'AI Extract', icon: Sparkles, sub: 'Add tasks' },
  { href: '/dashboard/projects', label: 'Projects', icon: FolderKanban, sub: 'All projects' },
  { href: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare, sub: 'All tasks' },
  { href: '/dashboard/calendar', label: 'Calendar', icon: Calendar, sub: 'Smart schedule' },
  { href: '/dashboard/tracker', label: 'Time tracker', icon: Timer, sub: 'Log time' },
  { href: '/dashboard/mindmap', label: 'Mind map', icon: GitFork, sub: 'All projects view' },
  { href: '/dashboard/insights', label: 'Insights', icon: BarChart2, sub: 'Weekly summary' },
]

export function Sidebar() {
  const path = usePathname()
  return (
    <aside className="w-56 h-screen flex flex-col shrink-0 bg-white border-r border-gray-100">
      {/* Logo + bell */}
      <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0 bg-[#e8f5ee]">
          <Image src="/logo.png" alt="Acreonix" width={28} height={28} className="object-contain" />
        </div>
        <div className="flex flex-col leading-none flex-1">
          <span className="text-[#1a1f2e] text-sm font-semibold tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>Acreonix</span>
          <span className="text-[10px] tracking-widest uppercase font-medium" style={{ color: '#c9a84c' }}>Tasks</span>
        </div>
        <NotificationBell />
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {nav.map(({ href, label, icon: Icon, sub }) => {
          const active = path === href || path.startsWith(href + '/')
          return (
            <Link key={href} href={href} className={cn('relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group', active ? 'bg-[#e8f5ee]' : 'hover:bg-gray-50')}>
              {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[#2d7a4f] rounded-r-full" />}
              <Icon size={16} className={cn('shrink-0 transition-colors', active ? 'text-[#2d7a4f]' : 'text-gray-400 group-hover:text-gray-600')} />
              <div className="flex flex-col leading-none">
                <span className={cn('text-xs font-medium', active ? 'text-[#2d7a4f]' : 'text-gray-700 group-hover:text-gray-900')}>{label}</span>
                <span className="text-[10px] text-gray-400 mt-0.5">{sub}</span>
              </div>
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-gray-100 flex items-center gap-3">
        <UserButton afterSignOutUrl="/" />
        <span className="text-xs text-gray-400">Account</span>
      </div>
    </aside>
  )
}
