'use client'
import { useUser } from '@clerk/nextjs'

import { Users, Plus, Mail, Crown, Shield } from 'lucide-react'
import { usePlan } from '@/lib/usePlan'
import Link from 'next/link'

export default function TeamsPage() {
  const plan = usePlan()
  const { user } = useUser()
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'You'
  const initials = [user?.firstName, user?.lastName].filter(Boolean).map(n => n![0].toUpperCase()).join('') || 'Y'
  const canUseTeams = plan.plan === 'team'

  if (!plan.loading && !canUseTeams) {
    return (
      <div className="px-8 py-8 max-w-2xl mx-auto">
        <h1 className="text-4xl font-black tracking-tight mb-2" style={{ color: '#101312', letterSpacing: '-0.5px' }}>Teams</h1>
        <p className="text-sm mb-8" style={{ color: '#9BA5A0' }}>Collaborate with your team on projects and tasks</p>

        <div className="rounded-2xl p-8 text-center" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(16,19,18,0.06)' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#EAF4EF' }}>
            <Users size={24} style={{ color: '#0D3D2E' }} />
          </div>
          <h2 className="text-xl font-black mb-2" style={{ color: '#101312' }}>Teams is a Team plan feature</h2>
          <p className="text-sm mb-6" style={{ color: '#9BA5A0' }}>
            Upgrade to Team to invite colleagues, share projects, and collaborate in real time.
          </p>
          <Link href="/dashboard/billing"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold"
            style={{ background: '#0D3D2E', color: '#fff' }}>
            View plans →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="px-8 py-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tight mb-1" style={{ color: '#101312', letterSpacing: '-0.5px' }}>Teams</h1>
          <p className="text-sm" style={{ color: '#9BA5A0' }}>Manage your workspace members</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: '#0D3D2E', color: '#fff' }}>
          <Plus size={14} /> Invite member
        </button>
      </div>

      {/* Current members placeholder */}
      <div className="rounded-2xl overflow-hidden mb-6" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(16,19,18,0.06)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid #F7F8F5' }}>
          <h2 className="font-bold text-sm" style={{ color: '#101312' }}>Members</h2>
        </div>
        {[
          { name: fullName, role: 'Owner', badge: Crown, image: user?.imageUrl, initials },
        ].map((m, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid #F7F8F5' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden"
              style={{ background: '#EAF4EF', color: '#0D3D2E' }}>
              {m.image ? <img src={m.image} alt={m.name} className="w-full h-full object-cover" /> : m.initials}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: '#101312' }}>{m.name}</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: '#EAF4EF' }}>
              <m.badge size={11} style={{ color: '#0D3D2E' }} />
              <span className="text-xs font-bold" style={{ color: '#0D3D2E' }}>{m.role}</span>
            </div>
          </div>
        ))}

        {/* Invite row */}
        <div className="px-5 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-dashed"
            style={{ borderColor: '#C8D0CC' }}>
            <Plus size={14} style={{ color: '#9BA5A0' }} />
          </div>
          <button className="text-sm font-medium" style={{ color: '#9BA5A0' }}>
            Invite a team member by email…
          </button>
        </div>
      </div>

      <p className="text-xs text-center" style={{ color: '#C8D0CC' }}>
        Team members can view and edit shared projects. Admins can manage members and settings.
      </p>
    </div>
  )
}
