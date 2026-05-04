'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import {
  LayoutDashboard, FolderKanban, CheckSquare,
  Sparkles, Calendar, GitFork, BarChart2, Timer, CreditCard, Zap, Users,
} from 'lucide-react'
import { NotificationBell } from './NotificationBell'
import { usePlan } from '@/lib/plan-context'

const NAV = [
  { href: '/dashboard',          label: 'Dashboard',    icon: LayoutDashboard, exact: true },
  { href: '/dashboard/extract',  label: 'AI Extract',   icon: Sparkles },
  { href: '/dashboard/projects', label: 'Projects',     icon: FolderKanban },
  { href: '/dashboard/tasks',    label: 'Tasks',        icon: CheckSquare },
  { href: '/dashboard/calendar', label: 'Calendar',     icon: Calendar },
  { href: '/dashboard/tracker',  label: 'Time tracker', icon: Timer,    proOnly: true },
  { href: '/dashboard/mindmap',  label: 'Mind map',     icon: GitFork },
  { href: '/dashboard/insights', label: 'Insights',     icon: BarChart2, proOnly: true },
  { href: '/dashboard/team',     label: 'Team',         icon: Users,    teamOnly: true },
]

const PLAN_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  free: { label: 'Free', bg: '#f3f3f1',  color: '#888' },
  pro:  { label: 'Pro',  bg: '#f0faf4',  color: '#1a5c35' },
  team: { label: 'Team', bg: '#fdf8ee',  color: '#7a5e1a' },
}

const S = {
  aside: {
    width: 240,
    minWidth: 240,
    height: '100vh',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    background: '#fbfbfa',
    borderRight: '1px solid rgba(0,0,0,0.07)',
    flexShrink: 0,
    // Hide on mobile via media query handled in globals.css
  } as React.CSSProperties,
}

export function Sidebar() {
  const path = usePathname()
  const { plan, loading } = usePlan()
  const badge = PLAN_BADGE[plan] ?? PLAN_BADGE.free

  return (
    <aside className="app-sidebar" style={S.aside}>

      {/* ── Logo ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '16px 18px 14px',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        flexShrink: 0,
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: '#f0faf4',
          border: '1px solid #c6e6d4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
        }}>
          <Image src="/logo.png" alt="" width={26} height={26} style={{ objectFit: 'contain' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.01em' }}>
            Acreonix
          </div>
          <div style={{ fontSize: 10, fontWeight: 500, color: '#c9a84c', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 1 }}>
            Tasks
          </div>
        </div>
        <NotificationBell />
      </div>

      {/* ── Nav ── */}
      <nav style={{
        flex: 1,
        overflowY: 'auto',
        padding: '10px 10px 6px',
        minHeight: 0,
      }}>
        {NAV.map(({ href, label, icon: Icon, exact, proOnly, teamOnly }) => {
          const active = exact
            ? path === href
            : (path === href || path.startsWith(href + '/'))

          const locked = (proOnly && plan === 'free') || (teamOnly && plan !== 'team')

          // Hide team link entirely if not on team plan
          if (!loading && locked && teamOnly) return null

          const isActive = active && !locked

          return (
            <Link
              key={href}
              href={locked ? '/dashboard/billing' : href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 8,
                marginBottom: 2,
                textDecoration: 'none',
                background: isActive ? 'rgba(45,122,79,0.09)' : 'transparent',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)'
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              <Icon
                size={16}
                style={{
                  color: isActive ? '#2d7a4f' : locked ? '#d1d5db' : '#888',
                  flexShrink: 0,
                  transition: 'color 0.12s',
                }}
              />
              <span style={{
                fontSize: 14,
                fontWeight: isActive ? 500 : 400,
                color: isActive ? '#1f5537' : locked ? '#d1d5db' : '#3a3a3a',
                flex: 1,
                lineHeight: 1.3,
                letterSpacing: '-0.01em',
                transition: 'color 0.12s',
              }}>
                {label}
              </span>
              {locked && proOnly && (
                <Zap size={12} style={{ color: '#c9a84c', flexShrink: 0 }} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── Bottom: plan + user ── */}
      <div style={{ flexShrink: 0, borderTop: '1px solid rgba(0,0,0,0.06)' }}>

        {/* Plan / billing */}
        <Link
          href="/dashboard/billing"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 18px',
            textDecoration: 'none',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.03)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        >
          <CreditCard size={15} style={{ color: '#bbb', flexShrink: 0 }} />
          <span style={{ fontSize: 13.5, color: '#888', flex: 1 }}>Plan</span>
          {!loading && (
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 5,
              background: badge.bg,
              color: badge.color,
            }}>
              {badge.label}
            </span>
          )}
        </Link>

        {/* User */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 18px',
          borderTop: '1px solid rgba(0,0,0,0.06)',
        }}>
          <UserButton afterSignOutUrl="/" />
          <span style={{ fontSize: 13.5, color: '#bbb' }}>Account</span>
        </div>
      </div>
    </aside>
  )
}
