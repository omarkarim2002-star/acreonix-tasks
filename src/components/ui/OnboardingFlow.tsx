'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, X, Sparkles, Calendar, CheckCircle2, BarChart2, Users, ChevronLeft } from 'lucide-react'

type Step = {
  id: string
  icon: React.ReactNode
  label: string
  title: string
  desc: string
  cta: string
  ctaHref?: string
  ctaAction?: 'next' | 'finish'
  skip?: boolean
  accentColour: string
}

const STEPS: Step[] = [
  {
    id: 'welcome',
    icon: <span style={{ fontSize: 36 }}>👋</span>,
    label: 'Welcome',
    title: 'Your AI productivity system',
    desc: 'Acreonix Tasks learns how you work, organises your tasks, schedules your week, and tells you what to do right now.',
    cta: 'Get started',
    ctaAction: 'next',
    accentColour: '#2d7a4f',
  },
  {
    id: 'extract',
    icon: <Sparkles size={28} color="#fff" />,
    label: 'Add tasks',
    title: 'Paste anything — AI organises it',
    desc: 'Dump your notes, emails, or WhatsApp messages. AI extracts tasks, creates projects, sets priorities, and shows a preview before saving anything.',
    cta: 'Add my first tasks',
    ctaHref: '/dashboard/extract',
    accentColour: '#2d7a4f',
  },
  {
    id: 'calendar',
    icon: <Calendar size={28} color="#fff" />,
    label: 'Schedule',
    title: 'AI schedules your week',
    desc: 'After adding tasks, go to Calendar and tap "AI schedule" — it builds an optimised week grouped by project so you stay in flow.',
    cta: 'Open calendar',
    ctaHref: '/dashboard/calendar',
    accentColour: '#1f5537',
  },
  {
    id: 'tracker',
    icon: <CheckCircle2 size={28} color="#fff" />,
    label: 'Track',
    title: 'Log time as you work',
    desc: 'Use the floating timer (bottom-right corner) to log time on any task. The more you log, the smarter AI scheduling gets each week.',
    cta: 'Got it',
    ctaAction: 'next',
    accentColour: '#2d7a4f',
  },
  {
    id: 'insights',
    icon: <BarChart2 size={28} color="#fff" />,
    label: 'Insights',
    title: 'Weekly AI analysis',
    desc: 'Every week, Insights shows where your time went, what patterns it spotted, and three specific things to change. Check it every Monday.',
    cta: 'See insights',
    ctaHref: '/dashboard/insights',
    accentColour: '#c9a84c',
  },
  {
    id: 'done',
    icon: <span style={{ fontSize: 36 }}>🚀</span>,
    label: 'Ready',
    title: "You're all set",
    desc: 'Start by pasting your tasks. Takes 60 seconds. Your first AI-scheduled week will be ready in under a minute.',
    cta: 'Add tasks now',
    ctaHref: '/dashboard/extract',
    accentColour: '#2d7a4f',
  },
]

type Props = { onComplete?: () => void }

export function OnboardingFlow({ onComplete }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  function dismiss() {
    localStorage.setItem('acreonix_onboarded', '1')
    onComplete?.()
  }

  function goNext() {
    if (step < STEPS.length - 1) {
      setLeaving(true)
      setTimeout(() => { setStep(s => s + 1); setLeaving(false) }, 200)
    }
  }

  function goBack() {
    if (step > 0) {
      setLeaving(true)
      setTimeout(() => { setStep(s => s - 1); setLeaving(false) }, 200)
    }
  }

  function handleCta() {
    if (current.ctaAction === 'finish' || isLast) {
      dismiss()
      if (current.ctaHref) router.push(current.ctaHref)
      return
    }
    if (current.ctaAction === 'next') {
      goNext()
      return
    }
    if (current.ctaHref) {
      dismiss()
      router.push(current.ctaHref)
    }
  }

  const pct = ((step + 1) / STEPS.length) * 100

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(15,23,42,0.55)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end',
      justifyContent: 'center',
      padding: '0 0 env(safe-area-inset-bottom, 0px)',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      <div style={{
        width: '100%', maxWidth: 520,
        background: '#fff',
        borderRadius: '24px 24px 0 0',
        overflow: 'hidden',
        boxShadow: '0 -8px 48px rgba(0,0,0,0.18)',
        animation: 'slideUp 0.3s cubic-bezier(0.4,0,0.2,1) forwards',
      }}>
        {/* Progress bar */}
        <div style={{ height: 3, background: '#f0f0ee' }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: current.accentColour,
            borderRadius: 2,
            transition: 'width 0.4s ease, background 0.3s',
          }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px 0',
        }}>
          <button
            onClick={goBack}
            disabled={step === 0}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: step === 0 ? 'transparent' : '#f0f0ee',
              border: 'none', cursor: step === 0 ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: step === 0 ? 0 : 1, transition: 'opacity 0.2s',
            }}
          >
            <ChevronLeft size={16} style={{ color: '#888' }} />
          </button>

          {/* Step dots */}
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                width: i === step ? 18 : 6,
                height: 6, borderRadius: 3,
                background: i === step ? current.accentColour : i < step ? current.accentColour + '50' : '#e8e8e5',
                transition: 'all 0.3s',
              }} />
            ))}
          </div>

          <button onClick={dismiss} style={{
            width: 32, height: 32, borderRadius: '50%', background: '#f0f0ee',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={14} style={{ color: '#888' }} />
          </button>
        </div>

        {/* Content */}
        <div style={{
          padding: '24px 28px 32px',
          opacity: leaving ? 0 : 1,
          transform: leaving ? 'translateY(8px)' : 'none',
          transition: 'opacity 0.2s, transform 0.2s',
        }}>
          {/* Icon */}
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: current.accentColour,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 20, boxShadow: `0 4px 16px ${current.accentColour}40`,
            transition: 'background 0.3s',
          }}>
            {current.icon}
          </div>

          {/* Step label */}
          <div style={{
            fontSize: 11, fontWeight: 600, color: current.accentColour,
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8,
            transition: 'color 0.3s',
          }}>
            {step + 1} of {STEPS.length} — {current.label}
          </div>

          {/* Title */}
          <h2 style={{
            fontSize: 22, fontWeight: 700, color: '#111',
            letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 12,
          }}>
            {current.title}
          </h2>

          {/* Description */}
          <p style={{
            fontSize: 15, color: '#555', lineHeight: 1.65, marginBottom: 28,
          }}>
            {current.desc}
          </p>

          {/* CTA */}
          <button onClick={handleCta} style={{
            width: '100%', padding: '14px 0',
            background: current.accentColour, color: '#fff',
            border: 'none', borderRadius: 12,
            fontSize: 15, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: 'DM Sans, sans-serif',
            boxShadow: `0 4px 16px ${current.accentColour}35`,
            transition: 'background 0.3s, box-shadow 0.3s',
          }}>
            {current.cta}
            <ArrowRight size={16} />
          </button>

          {/* Skip */}
          {!isLast && (
            <button onClick={dismiss} style={{
              width: '100%', marginTop: 10, padding: '10px 0',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: '#bbb', fontFamily: 'DM Sans, sans-serif',
            }}>
              Skip setup
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: none; opacity: 1; }
        }
      `}</style>
    </div>
  )
}
