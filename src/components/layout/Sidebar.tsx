'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Sparkles,
  Calendar,
  BarChart2,
  Settings,
} from 'lucide-react'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, sub: 'Command centre' },
  { href: '/dashboard/projects', label: 'Projects', icon: FolderKanban, sub: 'All projects' },
  { href: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare, sub: 'All tasks' },
  { href: '/dashboard/extract', label: 'AI Extract', icon: Sparkles, sub: 'Add with AI' },
]

const comingSoon = [
  { href: '#', label: 'Calendar', icon: Calendar, sub: 'Smart schedule' },
  { href: '#', label: 'Insights', icon: BarChart2, sub: 'Weekly summary' },
]

export function Sidebar() {
  const path = usePathname()

  return (
    <aside
      className="w-56 h-screen flex flex-col shrink-0"
      style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}
    >
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
        <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
          <Image src="/logo.png" alt="Acreonix" width={28} height={28} className="object-contain" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-white text-sm font-semibold tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
            Acreonix
          </span>
          <span className="text-[10px] tracking-widest uppercase" style={{ color: 'var(--gold)' }}>
            Tasks
          </span>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {nav.map(({ href, label, icon: Icon, sub }) => {
          const active = href === '/dashboard' ? path === href : path.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group',
                active
                  ? 'text-white'
                  : 'hover:bg-white/5'
              )}
              style={active ? { background: 'var(--sidebar-active-bg)' } : {}}
            >
              {active && <div className="nav-active-bar" />}
              <Icon
                size={16}
                className={cn('shrink-0 transition-colors', active ? 'text-white' : 'text-[#8b92a5] group-hover:text-white')}
                style={active ? { color: 'var(--green-light)' } : {}}
              />
              <div className="flex flex-col leading-none">
                <span className={cn('text-xs font-medium', active ? 'text-white' : 'text-[#8b92a5] group-hover:text-white')}>
                  {label}
                </span>
                <span className="text-[10px] text-[#4a5168] mt-0.5">{sub}</span>
              </div>
            </Link>
          )
        })}

        {/* Divider */}
        <div className="my-3" style={{ borderTop: '1px solid var(--sidebar-border)' }} />
        <p className="text-[9px] text-[#3a4155] uppercase tracking-widest px-3 mb-2 font-medium">Coming soon</p>

        {comingSoon.map(({ href, label, icon: Icon, sub }) => (
          <div
            key={label}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg opacity-40 cursor-not-allowed"
          >
            <Icon size={16} className="text-[#8b92a5] shrink-0" />
            <div className="flex flex-col leading-none">
              <span className="text-xs font-medium text-[#8b92a5]">{label}</span>
              <span className="text-[10px] text-[#4a5168] mt-0.5">{sub}</span>
            </div>
            <span className="ml-auto text-[9px] bg-[#1e2330] text-[#4a5168] px-1.5 py-0.5 rounded font-medium">P3</span>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-4 flex items-center gap-3" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
        <UserButton afterSignOutUrl="/" />
        <div className="flex flex-col leading-none min-w-0">
          <span className="text-xs text-[#8b92a5] truncate">Account</span>
        </div>
      </div>
    </aside>
  )
}
