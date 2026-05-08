'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { Logo } from './Logo'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, FolderKanban, CheckSquare,
  Calendar, BarChart2, Sparkles, Users, Settings,
} from 'lucide-react'

const nav = [
  { href:'/dashboard',            label:'Dashboard',  icon:LayoutDashboard },
  { href:'/dashboard/projects',   label:'Projects',   icon:FolderKanban    },
  { href:'/dashboard/tasks',      label:'Tasks',      icon:CheckSquare     },
  { href:'/dashboard/calendar',   label:'Calendar',   icon:Calendar        },
  { href:'/dashboard/insights',   label:'Insights',   icon:BarChart2       },
]

export function Sidebar() {
  const path = usePathname()

  return (
    <aside className="w-58 h-screen flex flex-col shrink-0" style={{ background:'#0D3D2E' }}>

      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor:'rgba(255,255,255,0.08)' }}>
        <Logo />
      </div>

      {/* AI Extract — lime accent CTA */}
      <div className="px-4 pt-4 pb-2">
        <Link
          href="/dashboard/extract"
          className="flex items-center gap-2.5 w-full text-sm font-bold px-4 py-3 rounded-xl transition-all"
          style={{
            background: '#D7F36A',
            color: '#071F17',
          }}
        >
          <Sparkles size={15} />
          ✦  AI Extract
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === '/dashboard' ? path === href : path.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all font-medium',
                active
                  ? 'text-white'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              )}
              style={active ? { background:'rgba(255,255,255,0.12)' } : {}}
            >
              <Icon size={16} className={active ? 'text-white' : 'text-white/40'} />
              <span className="flex-1">{label}</span>
              {active && (
                <div className="w-1.5 h-1.5 rounded-full" style={{ background:'#D7F36A' }} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Teams link */}
      <div className="px-3 pb-2">
        <Link
          href="/dashboard/teams"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition-all font-medium"
        >
          <Users size={16} />
          Teams
        </Link>
      </div>

      {/* User */}
      <div
        className="px-4 py-4 flex items-center gap-3"
        style={{ borderTop:'1px solid rgba(255,255,255,0.08)' }}
      >
        <UserButton afterSignOutUrl="/" />
        <span className="text-xs text-white/40 truncate">Account</span>
      </div>
    </aside>
  )
}
