'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { usePlan } from '@/lib/plan-context'
import { Logo } from './Logo'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, FolderKanban, CheckSquare,
  Sparkles, Calendar, GitFork, BarChart2, Clock, CreditCard,
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
  const { plan, loading: planLoading } = usePlan()

  function active(href: string) {
    return href === '/dashboard' ? path === href : path.startsWith(href)
  }

  return (
    <>
      {/* Top bar — md:hidden keeps it off desktop */}
      <header className="md:hidden flex items-center justify-between px-4 bg-white border-b border-gray-100 shrink-0" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)', height: 'calc(52px + max(env(safe-area-inset-top, 0px), 8px))' }}>
        <Logo size="small" />
        <div className="flex items-center gap-1">
          {SECONDARY.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                active(href)
                  ? 'bg-[rgba(45,122,79,0.1)] text-[#2d7a4f]'
                  : 'text-gray-300'
              )}
            >
              <Icon size={17} />
            </Link>
          ))}

          {/* Plan pill — links to billing */}
          {!planLoading && (
            <Link
              href="/dashboard/billing"
              title="Your plan"
              style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
                textTransform: 'uppercase', padding: '3px 7px', borderRadius: 5,
                background: plan === 'team' ? 'rgba(37,99,235,0.1)' : plan === 'pro' ? 'rgba(45,122,79,0.1)' : 'rgba(0,0,0,0.06)',
                color: plan === 'team' ? '#1d4ed8' : plan === 'pro' ? '#2d7a4f' : '#888',
                textDecoration: 'none', marginLeft: 2,
              }}
            >
              {plan}
            </Link>
          )}

          <div className="ml-1">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      {/* Bottom tab bar — fixed, md:hidden */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 flex items-stretch"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {PRIMARY.map(({ href, label, icon: Icon, special }) => {
          const isActive = active(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[9.5px] font-medium transition-colors relative',
                isActive ? 'text-[#2d7a4f]' : 'text-gray-400'
              )}
            >
              {special ? (
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center -mt-4 shadow-md transition-all',
                  isActive ? 'bg-[#2d7a4f]' : 'bg-[#f0f0ee]'
                )}>
                  <Icon size={20} color={isActive ? '#fff' : '#2d7a4f'} />
                </div>
              ) : (
                <Icon size={isActive ? 21 : 19} />
              )}
              <span className={special ? 'mt-0.5' : ''}>{label}</span>
              {isActive && !special && (
                <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-[#2d7a4f]" />
              )}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
