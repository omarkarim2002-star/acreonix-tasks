'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import {
  ArrowRight, X, Sparkles, Calendar, CheckCircle2,
  BarChart2, Clock, Mic, Zap, GitFork,
} from 'lucide-react'

const STORAGE_KEY = 'acreonix_onboarding_done'

type Step = {
  id: string
  icon: React.ReactNode
  label: string
  title: string
  desc: string
  cta: string
  ctaHref?: string
  ctaAction?: 'next' | 'finish'
  highlight?: { label: string; text: string }
  accentColour: string
}

const STEPS: Step[] = [
  {
    id: 'welcome',
    icon: <span style={{ fontSize: 36 }}>👋</span>,
    label: 'Welcome',
    title: 'Your AI clarity system',
    desc: "Acreonix Tasks doesn't just schedule your work — it helps you understand it first. Add tasks in seconds, see what matters most today, and let AI plan around your calendar.",
    cta: "Let's set it up",
    ctaAction: 'next',
    accentColour: '#2d7a4f',
  },
  {
    id: 'extract',
    icon: <Sparkles size={28} color="#fff" />,
    label: 'Add tasks',
    title: 'Type or speak your brain dump',
    desc: 'Paste a long email, WhatsApp thread, or voice your thoughts out loud. AI extracts every task, groups them into projects, sets priorities — then shows you a preview before saving anything.',
    cta: 'Add my first tasks',
    ctaHref: '/dashboard/extract',
    highlight: { label: '🎤 New', text: 'Tap the mic to speak your tasks instead of typing' },
    accentColour: '#2d7a4f',
  },
  {
    id: 'focus',
    icon: <Zap size={28} color="#fff" />,
    label: 'Daily focus',
    title: 'Know exactly what to do next',
    desc: 'Every morning, the dashboard shows your top tasks ranked by AI — with a reason for each. Tap "Show me the best order" to get a prioritised list without touching the calendar.',
    cta: 'See my dashboard',
    ctaHref: '/dashboard',
    highlight: { label: '✦ Smart', text: 'AI ranks by deadline urgency, priority and task type' },
    accentColour: '#1f5537',
  },
  {
    id: 'calendar',
    icon: <Calendar size={28} color="#fff" />,
    label: 'Schedule',
    title: 'AI plans your week for you',
    desc: 'Go to Calendar → tap "AI schedule" to build an optimised week. Or tap "Plan today" on the dashboard for a single-day plan in one tap. Import your existing Google or Outlook calendar and AI schedules around it.',
    cta: 'Open calendar',
    ctaHref: '/dashboard/calendar',
    highlight: { label: '📅 Import', text: 'Calendar → Import button to connect Google or Outlook' },
    accentColour: '#2d7a4f',
  },
  {
    id: 'hours',
    icon: <Clock size={28} color="#fff" />,
    label: 'Work hours',
    title: 'Set your working hours',
    desc: "Tell AI when you're available. It'll never schedule work tasks at midnight or on weekends unless you want it to. Takes 10 seconds to set up.",
    cta: 'Set work hours',
    ctaHref: '/dashboard/account',
    highlight: { label: '⚡ Important', text: 'AI scheduling uses these to build realistic plans' },
    accentColour: '#c9a84c',
  },
  {
    id: 'mindmap',
    icon: <GitFork size={28} color="#fff" />,
    label: 'Mind map',
    title: 'See everything at once',
    desc: 'The global mind map shows all your projects and tasks in a visual web. Click any task to open it inline, tick it off to fade it out, and drag to rearrange. Your whole workload at a glance.',
    cta: 'Open mind map',
    ctaHref: '/dashboard/mindmap',
    accentColour: '#2d7a4f',
  },
  {
    id: 'insights',
    icon: <BarChart2 size={28} color="#fff" />,
    label: 'Insights',
    title: 'AI learns your work patterns',
    desc: 'After a week of use, Insights shows you where your time actually goes, which days you overcommit, and how your estimates compare to reality. The longer you use it, the smarter it gets.',
    cta: "I'm ready — let's go",
    ctaAction: 'finish',
    accentColour: '#1f5537',
  },
]

export function OnboardingFlow() {
  const router = useRouter()
  const { user } = useUser()
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    // Show onboarding once per user, 1.5s after load
    try {
      if (localStorage.getItem(STORAGE_KEY)) return
    } catch {}
    const t = setTimeout(() => setVisible(true), 1500)
    return () => clearTimeout(t)
  }, [])

  function dismiss() {
    try { localStorage.setItem(STORAGE_KEY, '1') } catch {}
    setVisible(false)
  }

  function advance() {
    setLeaving(true)
    setTimeout(() => {
      setStep(s => s + 1)
      setLeaving(false)
    }, 200)
  }

  function handleCta() {
    const current = STEPS[step]
    if (current.ctaAction === 'finish') { dismiss(); return }
    if (current.ctaAction === 'next') { advance(); return }
    if (current.ctaHref) {
      // Navigate then advance (so they come back to next step)
      router.push(current.ctaHref)
      advance()
    }
  }

  if (!visible) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const firstName = user?.firstName ?? ''

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      padding: '0 0 24px',
      pointerEvents: 'none',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: '#fff',
        borderRadius: 24,
        boxShadow: '0 -4px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        pointerEvents: 'auto',
        animation: 'slideUp 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        margin: '0 16px',
      }}>

        {/* Progress bar */}
        <div style={{ height: 3, background: '#f0f0ee' }}>
          <div style={{
            height: '100%',
            width: `${((step + 1) / STEPS.length) * 100}%`,
            background: current.accentColour,
            transition: 'width 0.4s ease, background 0.3s',
            borderRadius: 2,
          }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px 0',
        }}>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                width: i === step ? 18 : 6, height: 6, borderRadius: 3,
                background: i === step ? current.accentColour : i < step ? current.accentColour + '50' : '#e8e8e5',
                transition: 'all 0.3s',
              }} />
            ))}
          </div>
          <button onClick={dismiss} style={{
            width: 30, height: 30, borderRadius: '50%', background: '#f0f0ee',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={13} style={{ color: '#888' }} />
          </button>
        </div>

        {/* Content */}
        <div style={{
          padding: '20px 24px 28px',
          opacity: leaving ? 0 : 1,
          transform: leaving ? 'translateY(8px)' : 'none',
          transition: 'opacity 0.2s, transform 0.2s',
        }}>
          {/* Icon */}
          <div style={{
            width: 58, height: 58, borderRadius: 16,
            background: current.accentColour,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16, boxShadow: `0 4px 14px ${current.accentColour}40`,
            transition: 'background 0.3s',
          }}>
            {current.icon}
          </div>

          {/* Step label */}
          <div style={{ fontSize: 10, fontWeight: 700, color: current.accentColour, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 6, transition: 'color 0.3s' }}>
            {step + 1} of {STEPS.length} — {current.label}
          </div>

          {/* Title */}
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111', letterSpacing: '-0.03em', lineHeight: 1.25, marginBottom: 10 }}>
            {step === 0 && firstName ? `Hey ${firstName} — ${current.title}` : current.title}
          </h2>

          {/* Description */}
          <p style={{ fontSize: 14, color: '#555', lineHeight: 1.65, marginBottom: current.highlight ? 12 : 20 }}>
            {current.desc}
          </p>

          {/* Highlight tip */}
          {current.highlight && (
            <div style={{
              background: current.accentColour + '10',
              border: `1px solid ${current.accentColour}25`,
              borderRadius: 9, padding: '9px 12px',
              marginBottom: 18, display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: current.accentColour, flexShrink: 0, marginTop: 1 }}>{current.highlight.label}</span>
              <span style={{ fontSize: 12, color: current.accentColour, opacity: 0.85, lineHeight: 1.5 }}>{current.highlight.text}</span>
            </div>
          )}

          {/* CTA */}
          <button onClick={handleCta} style={{
            width: '100%', padding: '13px 0',
            background: current.accentColour, color: '#fff',
            border: 'none', borderRadius: 12,
            fontSize: 14.5, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            fontFamily: 'DM Sans, sans-serif',
            boxShadow: `0 4px 14px ${current.accentColour}35`,
            transition: 'background 0.3s, box-shadow 0.3s',
          }}>
            {current.cta}
            {!isLast && <ArrowRight size={15} />}
            {isLast && <CheckCircle2 size={15} />}
          </button>

          {/* Skip */}
          {!isLast && (
            <button onClick={advance} style={{
              width: '100%', marginTop: 8, padding: '9px 0',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12.5, color: '#bbb', fontFamily: 'DM Sans, sans-serif',
            }}>
              Skip this step
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(120%); opacity: 0; }
          to   { transform: none; opacity: 1; }
        }
      `}</style>
    </div>
  )
}
