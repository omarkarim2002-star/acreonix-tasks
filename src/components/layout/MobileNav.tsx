'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import {
  LayoutDashboard, FolderKanban, CheckSquare,
  Sparkles, Calendar, GitFork, BarChart2, Clock
} from 'lucide-react'

// Primary nav — shown in bottom bar (max 5 for thumb reach)
const PRIMARY = [
  { href: '/dashboard',          label: 'Home',     icon: LayoutDashboard },
  { href: '/dashboard/tasks',    label: 'Tasks',    icon: CheckSquare },
  { href: '/dashboard/extract',  label: 'AI Add',   icon: Sparkles },
  { href: '/dashboard/calendar', label: 'Calendar', icon: Calendar },
  { href: '/dashboard/projects', label: 'Projects', icon: FolderKanban },
]

// Secondary nav — shown in top bar as icon row
const SECONDARY = [
  { href: '/dashboard/mindmap',  label: 'Mind map', icon: GitFork },
  { href: '/dashboard/insights', label: 'Insights', icon: BarChart2 },
  { href: '/dashboard/tracker',  label: 'Tracker',  icon: Clock },
]

export function MobileNav() {
  const path = usePathname()

  function isActive(href: string) {
    return href === '/dashboard' ? path === href : path.startsWith(href)
  }

  const activeSecondary = SECONDARY.find(s => isActive(s.href))

  return (
    <>
      {/* ── Top bar ── */}
      <header
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px',
          background: '#fff',
          borderBottom: '1px solid rgba(0,0,0,0.07)',
          position: 'sticky', top: 0, zIndex: 30,
          fontFamily: 'DM Sans, sans-serif',
        }}
        className="md:hidden"
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Acreonix" style={{ width: 22, height: 22, objectFit: 'contain' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#111', letterSpacing: '-0.01em' }}>Acreonix</span>
          <span style={{ fontSize: 9, fontWeight: 600, color: '#c9a84c', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 5px', background: 'rgba(201,168,76,0.1)', borderRadius: 4 }}>Tasks</span>
        </div>

        {/* Secondary nav icons + user */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {SECONDARY.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                title={label}
                style={{
                  width: 34, height: 34, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: active ? 'rgba(45,122,79,0.1)' : 'transparent',
                  color: active ? '#2d7a4f' : '#aaa',
                  transition: 'all 0.12s',
                }}
              >
                <Icon size={18} />
              </Link>
            )
          })}
          <div style={{ marginLeft: 6 }}>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      {/* ── Bottom tab bar ── */}
      <nav
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
          background: '#fff',
          borderTop: '1px solid rgba(0,0,0,0.08)',
          display: 'flex', alignItems: 'stretch',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          fontFamily: 'DM Sans, sans-serif',
        }}
        className="md:hidden"
      >
        {PRIMARY.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          const isAI = href === '/dashboard/extract'
          return (
            <Link
              key={href}
              href={href}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 3, padding: '8px 0 10px',
                color: active ? '#2d7a4f' : '#aaa',
                textDecoration: 'none',
                position: 'relative',
                transition: 'color 0.12s',
              }}
            >
              {/* AI Add — special pill style */}
              {isAI ? (
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: active ? '#2d7a4f' : '#f0f0ee',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: -14,
                  boxShadow: active ? '0 2px 8px rgba(45,122,79,0.3)' : '0 2px 6px rgba(0,0,0,0.1)',
                  transition: 'all 0.15s',
                }}>
                  <Sparkles size={19} color={active ? '#fff' : '#2d7a4f'} />
                </div>
              ) : (
                <>
                  <div style={{
                    width: active ? 28 : 24, height: active ? 28 : 24,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}>
                    <Icon size={active ? 22 : 20} />
                  </div>
                </>
              )}
              <span style={{
                fontSize: 9.5, fontWeight: active ? 600 : 400,
                letterSpacing: '0.01em',
                marginTop: isAI ? 2 : 0,
              }}>
                {label}
              </span>
              {/* Active indicator dot */}
              {active && !isAI && (
                <div style={{
                  position: 'absolute', bottom: 6, width: 4, height: 4,
                  borderRadius: '50%', background: '#2d7a4f',
                }} />
              )}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
