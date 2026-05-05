'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton, useUser } from '@clerk/nextjs'
import { Logo } from './Logo'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, FolderKanban, CheckSquare,
  Calendar, BarChart2, Sparkles, Clock,
  GitFork, Users, CreditCard,
} from 'lucide-react'

const PRIMARY_NAV = [
  { href: '/dashboard',           label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/dashboard/projects',  label: 'Projects',     icon: FolderKanban },
  { href: '/dashboard/tasks',     label: 'Tasks',        icon: CheckSquare },
  { href: '/dashboard/calendar',  label: 'Calendar',     icon: Calendar },
  { href: '/dashboard/mindmap',   label: 'Mind map',     icon: GitFork },
  { href: '/dashboard/insights',  label: 'Insights',     icon: BarChart2 },
]

const SECONDARY_NAV = [
  { href: '/dashboard/tracker',   label: 'Time tracker', icon: Clock },
  { href: '/dashboard/team',      label: 'Team',         icon: Users },
  { href: '/dashboard/billing',   label: 'Plan',         icon: CreditCard },
]

export function Sidebar() {
  const { user } = useUser()
  const path = usePathname()

  function active(href: string) {
    return href === '/dashboard' ? path === href : path.startsWith(href)
  }

  return (
    <aside className="w-60 h-screen flex flex-col bg-white border-r border-gray-100 shrink-0">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <Logo />
      </div>

      {/* AI Extract CTA */}
      <div className="px-4 pt-4 pb-2">
        <Link
          href="/dashboard/extract"
          className="flex items-center gap-2 w-full bg-[#2d7a4f] text-white text-sm font-medium px-3 py-2.5 rounded-xl hover:bg-[#1f5537] transition-colors"
        >
          <Sparkles size={15} />
          Add tasks with AI
        </Link>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        {PRIMARY_NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 transition-all',
              active(href)
                ? 'bg-[#e8f5ee] text-[#2d7a4f] font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <Icon size={16} />
            <span>{label}</span>
          </Link>
        ))}

        {/* Divider */}
        <div className="my-2 mx-2 border-t border-gray-100" />

        {/* Secondary nav */}
        {SECONDARY_NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 transition-all',
              active(href)
                ? 'bg-[#e8f5ee] text-[#2d7a4f] font-medium'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            )}
          >
            <Icon size={16} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      {/* User — links to account settings */}
      <Link
        href="/dashboard/account"
        className={cn(
          'px-4 py-4 border-t border-gray-100 flex items-center gap-3 hover:bg-gray-50 transition-colors',
          path === '/dashboard/account' && 'bg-[#f0faf4]'
        )}
      >
        <UserButton afterSignOutUrl="/" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-700 truncate">
            {user
              ? [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Account'
              : 'Account'}
          </p>
          <p className="text-[10px] text-gray-400">Settings</p>
        </div>
      </Link>

    </aside>
  )
}
