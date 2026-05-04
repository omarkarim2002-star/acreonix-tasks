'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import {
  LayoutDashboard, FolderKanban, CheckSquare,
  Sparkles, Calendar, GitFork, BarChart2, Timer, CreditCard, Zap,
} from 'lucide-react'
import { NotificationBell } from './NotificationBell'
import { usePlan } from '@/lib/plan-context'

const nav = [
  { href: '/dashboard',          label: 'Dashboard',    icon: LayoutDashboard, sub: 'Overview',        exact: true },
  { href: '/dashboard/extract',  label: 'AI Extract',   icon: Sparkles,        sub: 'Add tasks' },
  { href: '/dashboard/projects', label: 'Projects',     icon: FolderKanban,    sub: 'All projects' },
  { href: '/dashboard/tasks',    label: 'Tasks',        icon: CheckSquare,     sub: 'All tasks' },
  { href: '/dashboard/calendar', label: 'Calendar',     icon: Calendar,        sub: 'Smart schedule' },
  { href: '/dashboard/tracker',  label: 'Time tracker', icon: Timer,           sub: 'Log time',        proOnly: true },
  { href: '/dashboard/mindmap',  label: 'Mind map',     icon: GitFork,         sub: 'All projects' },
  { href: '/dashboard/insights', label: 'Insights',     icon: BarChart2,       sub: 'Weekly summary',  proOnly: true },
]

const PLAN_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  free: { label: 'Free',  bg: '#f1f3f5',       color: '#6b7280' },
  pro:  { label: 'Pro',   bg: '#f0faf4',        color: '#2d7a4f' },
  team: { label: 'Team',  bg: '#fdf8ee',        color: '#92700a' },
}

export function Sidebar() {
  const path = usePathname()
  const { plan, loading } = usePlan()
  const badge = PLAN_BADGE[plan] ?? PLAN_BADGE.free

  return (
    <aside style={{
      width: 220,
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#ffffff',
      borderRight: '1px solid #e5e7eb',
      flexShrink: 0,
      overflow: 'hidden',
    }}>

      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 16px 13px',
        borderBottom: '1px solid #e5e7eb',
        flexShrink: 0,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6, overflow: 'hidden',
          background: '#f0faf4', border: '1px solid #bbddc9',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Image src="/logo.png" alt="Acreonix" width={22} height={22} style={{ objectFit: 'contain' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', letterSpacing: '-0.01em', lineHeight: 1 }}>Acreonix</div>
          <div style={{ fontSize: 10, fontWeight: 500, color: '#c9a84c', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>Tasks</div>
        </div>
        <NotificationBell />
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '6px 8px', minHeight: 0 }}>
        {nav.map(({ href, label, icon: Icon, sub, exact, proOnly }) => {
          const active = exact ? path === href : (path === href || path.startsWith(href + '/'))
          const locked = proOnly && plan === 'free' && !loading
          return (
            <Link
              key={href}
              href={locked ? '/dashboard/billing' : href}
              className="nav-active"
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '6px 8px',
                borderRadius: 6,
                marginBottom: 1,
                textDecoration: 'none',
                background: active ? '#f0faf4' : 'transparent',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#f8f9fa' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <Icon
                size={15}
                style={{ color: active ? '#2d7a4f' : locked ? '#d1d5db' : '#6b7280', flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: active ? 500 : 400,
                  color: active ? '#2d7a4f' : locked ? '#d1d5db' : '#374151',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {label}
                </div>
              </div>
              {locked && <Zap size={11} style={{ color: '#c9a84c', flexShrink: 0 }} />}
            </Link>
          )
        })}
      </nav>

      {/* Plan + billing */}
      <div style={{ flexShrink: 0, borderTop: '1px solid #e5e7eb' }}>
        <Link href="/dashboard/billing" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', textDecoration: 'none',
          transition: 'background 0.1s',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f8f9fa' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <CreditCard size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#6b7280', flex: 1 }}>Plan</span>
          {!loading && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
              background: badge.bg, color: badge.color,
            }}>
              {badge.label}
            </span>
          )}
        </Link>

        {/* User */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '10px 16px', borderTop: '1px solid #e5e7eb',
        }}>
          <UserButton afterSignOutUrl="/" />
          <span style={{ fontSize: 12, color: '#9ca3af' }}>Account</span>
        </div>
      </div>
    </aside>
  )
}
