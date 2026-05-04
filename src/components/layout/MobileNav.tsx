'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { LayoutDashboard, FolderKanban, CheckSquare, Sparkles, BarChart2 } from 'lucide-react'
import { NotificationBell } from './NotificationBell'

const nav = [
  { href: '/dashboard',          label: 'Home',     icon: LayoutDashboard, exact: true },
  { href: '/dashboard/extract',  label: 'AI',       icon: Sparkles },
  { href: '/dashboard/projects', label: 'Projects', icon: FolderKanban },
  { href: '/dashboard/tasks',    label: 'Tasks',    icon: CheckSquare },
  { href: '/dashboard/insights', label: 'Insights', icon: BarChart2 },
]

export function MobileNav() {
  const path = usePathname()
  return (
    <>
      <header className="md:hidden" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', height: 52,
        background: '#fff', borderBottom: '1px solid #e5e7eb',
        position: 'sticky', top: 0, zIndex: 30,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, overflow: 'hidden', background: '#f0faf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Image src="/logo.png" alt="Acreonix" width={20} height={20} style={{ objectFit: 'contain' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Acreonix</span>
          <span style={{ fontSize: 9, fontWeight: 500, color: '#c9a84c', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Tasks</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <NotificationBell />
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <nav className="md:hidden" style={{
        display: 'flex', position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
        background: '#fff', borderTop: '1px solid #e5e7eb',
      }}>
        {nav.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? path === href : (path === href || path.startsWith(href + '/'))
          return (
            <Link key={href} href={href} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '10px 0', textDecoration: 'none',
              color: active ? '#2d7a4f' : '#9ca3af',
              transition: 'color 0.1s',
            }}>
              <Icon size={19} />
              <span style={{ fontSize: 10, fontWeight: active ? 500 : 400 }}>{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
