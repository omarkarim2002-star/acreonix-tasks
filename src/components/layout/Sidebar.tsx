'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
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
  const path = usePathname()

  return (
    <aside
      className="w-58 h-screen flex flex-col shrink-0 relative overflow-hidden"
      style={{ width: '232px' }}
    >
      {/* Animated gradient background — not flat */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 120% 60% at 10% 0%, rgba(45,122,79,0.35) 0%, transparent 60%),
            radial-gradient(ellipse 80% 50% at 90% 100%, rgba(215,243,106,0.12) 0%, transparent 55%),
            radial-gradient(ellipse 60% 40% at 50% 50%, rgba(13,61,46,0.4) 0%, transparent 70%),
            linear-gradient(160deg, #0F4535 0%, #0A2E1F 40%, #071F17 100%)
          `,
        }}
      />

      {/* Subtle top highlight line */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(215,243,106,0.3), transparent)' }}
      />

      {/* Content — on top of gradient */}
      <div className="relative flex flex-col h-full">

        {/* Logo */}
        <div
          className="px-5 py-5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <Logo light />
        </div>

        {/* AI Extract CTA — lime pill */}
        <div className="px-4 pt-4 pb-2">
          <Link
            href="/dashboard/extract"
            className="flex items-center gap-2.5 w-full text-sm font-bold px-4 py-3 rounded-xl transition-all hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, #D7F36A 0%, #C8E85A 100%)',
              color: '#071F17',
              boxShadow: '0 4px 14px rgba(215,243,106,0.25)',
            }}
          >
            <Sparkles size={14} />
            ✦  AI Extract
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = href === '/dashboard' ? path === href : path.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                  active ? 'font-semibold' : 'font-normal hover:bg-white/5'
                )}
                style={active ? {
                  background: 'rgba(255,255,255,0.10)',
                  color: '#fff',
                  backdropFilter: 'blur(4px)',
                } : {
                  color: 'rgba(255,255,255,0.45)',
                }}
              >
                <Icon
                  size={16}
                  style={{ color: active ? '#D7F36A' : 'rgba(255,255,255,0.35)' }}
                />
                <span className="flex-1">{label}</span>
                {active && (
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: '#D7F36A' }}
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Teams */}
        <div className="px-3 pb-1">
          <Link
            href="/dashboard/teams"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all hover:bg-white/5"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            <Users size={16} style={{ color: 'rgba(255,255,255,0.25)' }} />
            Teams
          </Link>
        </div>

        {/* User */}
        <div
          className="px-4 py-4 flex items-center gap-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
        >
          <UserButton afterSignOutUrl="/" />
          <span className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Account
          </span>
        </div>
      </div>
    </aside>
  )
}
