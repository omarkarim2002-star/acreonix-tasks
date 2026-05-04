'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, FolderKanban, CheckSquare,
  Sparkles, Calendar, GitFork, BarChart2, Timer, CreditCard, Zap,
} from 'lucide-react'
import { NotificationBell } from './NotificationBell'
import { usePlan } from '@/lib/plan-context'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, sub: 'Overview', exact: true },
  { href: '/dashboard/extract', label: 'AI Extract', icon: Sparkles, sub: 'Add tasks' },
  { href: '/dashboard/projects', label: 'Projects', icon: FolderKanban, sub: 'All projects' },
  { href: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare, sub: 'All tasks' },
  { href: '/dashboard/calendar', label: 'Calendar', icon: Calendar, sub: 'Smart schedule' },
  { href: '/dashboard/tracker', label: 'Time tracker', icon: Timer, sub: 'Log time', proOnly: true },
  { href: '/dashboard/mindmap', label: 'Mind map', icon: GitFork, sub: 'All projects' },
  { href: '/dashboard/insights', label: 'Insights', icon: BarChart2, sub: 'Weekly summary', proOnly: true },
]

const PLAN_BADGE = {
  free: { label: 'Free', bg: '#f4f6f8', color: '#9aa3b4' },
  pro: { label: 'Pro', bg: '#e8f4ee', color: '#2d7a4f' },
  team: { label: 'Team', bg: '#faf5e8', color: '#c9a84c' },
}

export function Sidebar() {
  const path = usePathname()
  const { plan, loading } = usePlan()
  const badge = PLAN_BADGE[plan as keyof typeof PLAN_BADGE] ?? PLAN_BADGE.free

  return (
    <aside className="h-screen flex flex-col shrink-0" style={{ width: 224, background: '#fff', borderRight: '1px solid #e8edf2' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid #e8edf2' }}>
        <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0" style={{ background: '#e8f4ee' }}>
          <Image src="/logo.png" alt="Acreonix" width={26} height={26} className="object-contain" />
        </div>
        <div className="flex flex-col leading-none flex-1 min-w-0">
          <span className="text-sm font-semibold tracking-wide truncate" style={{ color: '#141b2d' }}>Acreonix</span>
          <span className="text-[9px] tracking-[0.18em] uppercase font-medium" style={{ color: '#c9a84c' }}>Tasks</span>
        </div>
        <NotificationBell />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5">
        {nav.map(({ href, label, icon: Icon, sub, exact, proOnly }) => {
          const active = exact ? path === href : (path === href || path.startsWith(href + '/'))
          const locked = proOnly && plan === 'free' && !loading
          return (
            <Link key={href} href={locked ? '/dashboard/billing' : href}
              className={cn('relative flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-all group', active ? 'bg-[#e8f4ee]' : 'hover:bg-[#f4f6f8]')}
            >
              <Icon size={15} className="shrink-0 transition-colors" style={{ color: active ? '#2d7a4f' : locked ? '#c8d0dc' : '#9aa3b4' }} />
              <div className="flex flex-col leading-none min-w-0 flex-1">
                <span className="text-[13px] font-medium truncate transition-colors" style={{ color: active ? '#2d7a4f' : locked ? '#c8d0dc' : '#3d4657' }}>{label}</span>
                <span className="text-[10px] truncate mt-0.5" style={{ color: '#9aa3b4' }}>{sub}</span>
              </div>
              {locked && (
                <Zap size={11} style={{ color: '#c9a84c', flexShrink: 0 }} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Plan badge + billing link */}
      <div className="px-3 py-2.5" style={{ borderTop: '1px solid #e8edf2' }}>
        <Link href="/dashboard/billing" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#f4f6f8] transition-colors">
          <CreditCard size={14} style={{ color: '#9aa3b4', flexShrink: 0 }} />
          <div className="flex-1 min-w-0">
            <span className="text-[12px] text-gray-500">Plan</span>
          </div>
          {!loading && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: badge.bg, color: badge.color }}>
              {badge.label}
            </span>
          )}
        </Link>
      </div>

      {/* User */}
      <div className="px-4 py-3.5 flex items-center gap-3" style={{ borderTop: '1px solid #e8edf2' }}>
        <UserButton afterSignOutUrl="/" />
        <span className="text-xs truncate" style={{ color: '#9aa3b4' }}>Account</span>
      </div>
    </aside>
  )
}
