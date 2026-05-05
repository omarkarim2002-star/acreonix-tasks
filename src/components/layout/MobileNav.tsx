'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import {
  LayoutDashboard, CheckSquare, Sparkles,
  Calendar, FolderKanban, GitFork, BarChart2, Clock,
} from 'lucide-react'

const PRIMARY = [
  { href: '/dashboard',          label: 'Home',     icon: LayoutDashboard },
  { href: '/dashboard/tasks',    label: 'Tasks',    icon: CheckSquare },
  { href: '/dashboard/extract',  label: 'AI Add',   icon: Sparkles,  special: true },
  { href: '/dashboard/calendar', label: 'Calendar', icon: Calendar },
  { href: '/dashboard/projects', label: 'Projects', icon: FolderKanban },
]

const SECONDARY = [
  { href: '/dashboard/mindmap',  label: 'Mind map', icon: GitFork },
  { href: '/dashboard/insights', label: 'Insights', icon: BarChart2 },
  { href: '/dashboard/tracker',  label: 'Tracker',  icon: Clock },
]

export function MobileNav() {
  const path = usePathname()

  function active(href: string) {
    return href === '/dashboard' ? path === href : path.startsWith(href)
  }

  return (
    <>
      {/* ── Top bar — normal flow, renders above <main> ── */}
      <header className="md:hidden" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        height: 52,
        background: '#fff',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        fontFamily: 'DM Sans, sans-serif',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#111', letterSpacing: '-0.01em' }}>
            Acreonix
          </span>
          <span style={{
            fontSize: 9, fontWeight: 600, color: '#c9a84c',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '2px 5px', background: 'rgba(201,168,76,0.1)', borderRadius: 4,
          }}>
            Tasks
          </span>
        </div>

        {/* Secondary icons + user avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {SECONDARY.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} title={label} style={{
              width: 34, height: 34, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: active(href) ? 'rgba(45,122,79,0.1)' : 'transparent',
              color: active(href) ? '#2d7a4f' : '#bbb',
            }}>
              <Icon size={18} />
            </Link>
          ))}
          <div style={{ marginLeft: 4 }}>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      {/* ── Bottom tab bar — fixed, always on top ── */}
      <nav className="md:hidden" style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 50,
        background: '#fff',
        borderTop: '1px solid rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'stretch',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        {PRIMARY.map(({ href, label, icon: Icon, special }) => {
          const isActive = active(href)
          return (
            <Link key={href} href={href} style={{
              flex: 1,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 3, padding: '8px 0 10px',
              color: isActive ? '#2d7a4f' : '#aaa',
              textDecoration: 'none',
              position: 'relative',
            }}>
              {special ? (
                /* AI Add — floating pill */
                <div style={{
                  width: 42, height: 42, borderRadius: '50%',
                  background: isActive ? '#2d7a4f' : '#f0f0ee',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: -16,
                  boxShadow: isActive
                    ? '0 3px 10px rgba(45,122,79,0.35)'
                    : '0 2px 6px rgba(0,0,0,0.1)',
                  transition: 'all 0.15s',
                }}>
                  <Icon size={20} color={isActive ? '#fff' : '#2d7a4f'} />
                </div>
              ) : (
                <Icon size={isActive ? 22 : 20} />
              )}
              <span style={{
                fontSize: 9.5, fontWeight: isActive ? 600 : 400,
                marginTop: special ? 2 : 0,
              }}>
                {label}
              </span>
              {isActive && !special && (
                <div style={{
                  position: 'absolute', bottom: 5,
                  width: 4, height: 4, borderRadius: '50%',
                  background: '#2d7a4f',
                }} />
              )}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
