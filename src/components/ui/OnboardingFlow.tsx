'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, CheckCircle2, Calendar, BarChart2, ArrowRight, Loader2 } from 'lucide-react'

const STEPS = [
  {
    icon: '👋',
    title: 'Welcome to Acreonix Tasks',
    subtitle: 'Your AI-powered productivity system',
    desc: 'In the next 60 seconds, AI will organise your tasks, schedule your week, and show you exactly what to work on first.',
    cta: 'Get started',
  },
  {
    icon: '✦',
    title: 'Paste your tasks — AI does the rest',
    subtitle: 'Step 1 of 2',
    desc: 'Paste any text — notes, emails, a to-do list, a brain dump. AI extracts tasks, groups them into projects, and assigns priorities.',
    cta: 'Try it now',
  },
  {
    icon: '📅',
    title: 'Then schedule your week',
    subtitle: 'Step 2 of 2',
    desc: 'After adding tasks, click "AI schedule" in the Calendar to auto-schedule your week — grouping tasks by project to protect your focus.',
    cta: 'Go to dashboard',
  },
]

const FEATURES = [
  { icon: <Sparkles size={14} style={{ color: '#2d7a4f' }} />, label: 'AI task extraction' },
  { icon: <Calendar size={14} style={{ color: '#2d7a4f' }} />, label: 'Smart scheduling' },
  { icon: <CheckCircle2 size={14} style={{ color: '#2d7a4f' }} />, label: 'Mind map view' },
  { icon: <BarChart2 size={14} style={{ color: '#2d7a4f' }} />, label: 'Weekly insights' },
]

type Props = { onComplete?: () => void }

export function OnboardingFlow({ onComplete }: Props) {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const current = STEPS[step]

  async function handleCta() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
      return
    }
    setLoading(true)
    // Mark onboarding complete in localStorage
    localStorage.setItem('acreonix_onboarded', '1')
    onComplete?.()
    router.push('/dashboard/extract')
  }

  function skip() {
    localStorage.setItem('acreonix_onboarded', '1')
    onComplete?.()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(20,27,45,0.65)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480,
        overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.15)',
        animation: 'fadeUp 0.25s ease forwards',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        {/* Progress bar */}
        <div style={{ height: 3, background: '#e8edf2' }}>
          <div style={{
            height: '100%', background: '#2d7a4f', borderRadius: 2,
            width: `${((step + 1) / STEPS.length) * 100}%`,
            transition: 'width 0.4s ease',
          }} />
        </div>

        <div style={{ padding: 32 }}>
          {/* Icon */}
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: '#e8f4ee', border: '1px solid #a8d5bc',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, marginBottom: 20,
          }}>
            {current.icon}
          </div>

          {/* Step label */}
          {current.subtitle && (
            <p style={{ fontSize: 11, fontWeight: 600, color: '#c9a84c', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              {current.subtitle}
            </p>
          )}

          {/* Title */}
          <h2 style={{ fontSize: 22, fontWeight: 600, color: '#141b2d', marginBottom: 10, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
            {current.title}
          </h2>

          {/* Description */}
          <p style={{ fontSize: 14, color: '#5a6478', lineHeight: 1.7, marginBottom: 24 }}>
            {current.desc}
          </p>

          {/* Feature pills — only on step 0 */}
          {step === 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              {FEATURES.map(f => (
                <div key={f.label} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: '#e8f4ee', border: '1px solid #a8d5bc',
                  borderRadius: 20, padding: '5px 12px',
                  fontSize: 12, fontWeight: 500, color: '#2d7a4f',
                }}>
                  {f.icon}{f.label}
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleCta}
            disabled={loading}
            style={{
              width: '100%', padding: '13px 0', borderRadius: 10,
              background: '#2d7a4f', color: '#fff', border: 'none',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 0.15s', fontFamily: 'DM Sans, sans-serif',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
            {loading ? 'Setting up…' : current.cta}
            {!loading && <ArrowRight size={15} />}
          </button>

          {/* Skip */}
          <button
            onClick={skip}
            style={{
              width: '100%', marginTop: 10, padding: '10px 0',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: '#9aa3b4', fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Skip for now
          </button>

          {/* Dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                width: i === step ? 20 : 6, height: 6, borderRadius: 3,
                background: i === step ? '#2d7a4f' : '#e8edf2',
                transition: 'all 0.3s',
              }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
