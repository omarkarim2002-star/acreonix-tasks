'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser, UserButton } from '@clerk/nextjs'
import { Logo } from './Logo'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, FolderKanban, CheckSquare,
  Calendar, BarChart2, Sparkles, Users, Network,
} from 'lucide-react'

const nav = [
  { href:'/dashboard',          label:'Dashboard', icon:LayoutDashboard },
  { href:'/dashboard/projects', label:'Projects',  icon:FolderKanban    },
  { href:'/dashboard/tasks',    label:'Tasks',     icon:CheckSquare     },
  { href:'/dashboard/calendar', label:'Calendar',  icon:Calendar        },
  { href:'/dashboard/insights', label:'Insights',  icon:BarChart2       },
  { href:'/dashboard/mindmap',  label:'Mind map',  icon:Network         },
]

export function Sidebar() {
  const path    = usePathname()
  const { user } = useUser()

  const firstName = user?.firstName ?? ''
  const lastName  = user?.lastName  ?? ''
  const fullName  = [firstName, lastName].filter(Boolean).join(' ')
  const initials  = [firstName, lastName].filter(Boolean).map(n => n[0].toUpperCase()).join('') || '?'

  return (
    <aside className="w-58 h-screen flex flex-col shrink-0 relative overflow-hidden" style={{ width:'232px' }}>
      {/* Gradient background */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background:`
          radial-gradient(ellipse 120% 60% at 10% 0%, rgba(45,122,79,0.35) 0%, transparent 60%),
          radial-gradient(ellipse 80% 50% at 90% 100%, rgba(215,243,106,0.12) 0%, transparent 55%),
          linear-gradient(160deg, #0F4535 0%, #0A2E1F 40%, #071F17 100%)
        `,
      }} />

      {/* Top highlight */}
      <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background:'linear-gradient(90deg, transparent, rgba(215,243,106,0.3), transparent)' }} />

      <div className="relative flex flex-col h-full">
        {/* Logo */}
        <div className="px-5 py-5" style={{ borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
          <Logo light />
        </div>

        {/* AI Extract CTA */}
        <div className="px-4 pt-4 pb-2">
          <Link href="/dashboard/extract"
            className="flex items-center gap-2.5 w-full text-sm font-bold px-4 py-3 rounded-xl transition-all hover:opacity-90"
            style={{ background:'linear-gradient(135deg, #D7F36A 0%, #C8E85A 100%)', color:'#071F17', boxShadow:'0 4px 14px rgba(215,243,106,0.25)' }}
          >
            <Sparkles size={14} />✦  AI Extract
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = href === '/dashboard' ? path === href : path.startsWith(href)
            return (
              <Link key={href} href={href}
                className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all', active ? 'font-semibold' : 'font-normal hover:bg-white/5')}
                style={active ? { background:'rgba(255,255,255,0.10)', color:'#fff' } : { color:'rgba(255,255,255,0.45)' }}
              >
                <Icon size={16} style={{ color: active ? '#D7F36A' : 'rgba(255,255,255,0.35)' }} />
                <span className="flex-1">{label}</span>
                {active && <div className="w-1.5 h-1.5 rounded-full" style={{ background:'#D7F36A' }} />}
              </Link>
            )
          })}
        </nav>

        {/* Teams */}
        <div className="px-3 pb-1">
          <Link href="/dashboard/teams"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all hover:bg-white/5"
            style={{ color:'rgba(255,255,255,0.35)' }}
          >
            <Users size={16} style={{ color:'rgba(255,255,255,0.25)' }} />
            Teams
          </Link>
        </div>

        {/* User — clickable, shows name + plan pill */}
        <div className="px-3 py-3" style={{ borderTop:'1px solid rgba(255,255,255,0.07)' }}>
          <Link href="/dashboard/account"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/8 transition-all group"
            style={{}}
          >
            {/* Avatar */}
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background:'rgba(215,243,106,0.2)', color:'#D7F36A' }}>
              {initials}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color:'rgba(255,255,255,0.85)' }}>
                {fullName || 'Account'}
              </p>
              <p className="text-xs truncate" style={{ color:'rgba(255,255,255,0.35)' }}>
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>

            {/* Plan pill */}
            <span className="text-xs font-bold px-1.5 py-0.5 rounded shrink-0"
              style={{ background:'rgba(215,243,106,0.15)', color:'#D7F36A', fontSize:'9px', letterSpacing:'0.5px' }}>
              FREE
            </span>
          </Link>
        </div>
      </div>
    </aside>
  )
}
