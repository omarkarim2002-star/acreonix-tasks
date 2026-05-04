'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { cn } from '@/lib/utils'
import { LayoutDashboard, FolderKanban, CheckSquare, Sparkles } from 'lucide-react'

const nav = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/dashboard/projects', label: 'Projects', icon: FolderKanban },
  { href: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/dashboard/extract', label: 'AI Add', icon: Sparkles },
]

export function MobileNav() {
  const path = usePathname()
  return (
    <>
      <header className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-30" style={{ background: 'var(--sidebar-bg)', borderBottom: '1px solid var(--sidebar-border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md overflow-hidden bg-white/10 flex items-center justify-center">
            <Image src="/logo.png" alt="Acreonix" width={24} height={24} className="object-contain" />
          </div>
          <span className="text-white text-sm font-semibold tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>Acreonix</span>
          <span className="text-[10px] tracking-widest uppercase" style={{ color: 'var(--gold)' }}>Tasks</span>
        </div>
        <UserButton afterSignOutUrl="/" />
      </header>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex" style={{ background: 'var(--sidebar-bg)', borderTop: '1px solid var(--sidebar-border)' }}>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === '/dashboard' ? path === href : path.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn('flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors', active ? 'text-white' : 'text-[#8b92a5]')}
              style={active ? { color: '#3a9962' } : {}}
            >
              <Icon size={20} />
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
