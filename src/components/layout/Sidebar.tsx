'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { Logo } from './Logo'
import { cn } from '@/lib/utils'
import { LayoutDashboard, FolderKanban, CheckSquare, Sparkles } from 'lucide-react'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/projects', label: 'Projects', icon: FolderKanban },
  { href: '/dashboard/tasks', label: 'All tasks', icon: CheckSquare },
]

export function Sidebar() {
  const path = usePathname()
  return (
    <aside className="w-56 h-screen flex flex-col bg-white border-r border-gray-100 shrink-0">
      <div className="px-5 py-5 border-b border-gray-100"><Logo /></div>
      <div className="px-4 pt-4 pb-2">
        <Link href="/dashboard/extract" className="flex items-center gap-2 w-full bg-[#2d7a4f] text-white text-sm font-medium px-3 py-2.5 rounded-xl hover:bg-[#1f5537] transition-colors">
          <Sparkles size={15} />Add tasks with AI
        </Link>
      </div>
      <nav className="flex-1 px-3 py-2">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === '/dashboard' ? path === href : path.startsWith(href)
          return (
            <Link key={href} href={href} className={cn('flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 transition-all', active ? 'bg-[#e8f5ee] text-[#2d7a4f] font-medium' : 'text-gray-600 hover:bg-gray-50')}>
              <Icon size={16} />{label}
            </Link>
          )
        })}
      </nav>
      <div className="px-4 py-4 border-t border-gray-100 flex items-center gap-3">
        <UserButton afterSignOutUrl="/" />
        <span className="text-xs text-gray-500">Account</span>
      </div>
    </aside>
  )
}
