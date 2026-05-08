'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Sparkles, Loader2, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, Clock, RefreshCw,
  Lightbulb, Zap, BarChart2, Target, Minus,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
type WeeklyInsight = { type: 'success'|'warning'|'tip'|'pattern'; title: string; detail: string }
type WeeklyData = {
  headline: string; score: number; scoreLabel: string
  completedCount: number; totalMinutes: number; topProject: string
  insights: WeeklyInsight[]; tips: string[]; tomorrowFocus: string
  timeBreakdown: { name: string; minutes: number; pct: number }[]
  period: string; generatedAt: string
}

type BehaviourPattern = {
  title: string; observation: string; impact: string
  suggestion: string; type: 'positive'|'warning'|'neutral'
}
type BehaviourData = {
  hasEnoughData: boolean; message?: string
  analysis?: {
    headline: string
    patterns: BehaviourPattern[]
    weeklyScore: { score: number; label: string; trend: 'improving'|'declining'|'stable' }
    coachingTip: string
  }
  rawStats?: {
    totalHours: number; tasksCompleted: number; tasksPending: number
    overdueCount: number; peakHour: number | null
    mostProductiveDay: string; leastProductiveDay: string
    avgEstimationRatio: number | null
    timeByProject: Record<string, number>
    weeklyCompletions: Record<string, number>
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtMins(m: number): string {
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h${m % 60 > 0 ? ` ${m % 60}m` : ''}`
}
function fmtHour(h: number): string {
  if (h === 0) return '12am'
  if (h < 12) return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
}

const PROJECT_COLOURS = ['#2d7a4f','#c9a84c','#3b82f6','#8b5cf6','#ec4899','#f97316','#14b8a6']

const PATTERN_STYLE = {
  positive: { bg: '#f0faf4', border: '#c6e6d4', icon: CheckCircle2, iconColor: '#2d7a4f', titleColor: '#1f5537' },
  warning:  { bg: '#fff8f0', border: '#fed7aa', icon: AlertTriangle, iconColor: '#ea580c', titleColor: '#9a3412' },
  neutral:  { bg: '#f9f9f7', border: '#e0e0dd', icon: Lightbulb,    iconColor: '#888',    titleColor: '#444' },
}

const WEEKLY_STYLE = {
  success: { bg: '#f0faf4', border: '#c6e6d4', icon: CheckCircle2, color: '#2d7a4f' },
  warning: { bg: '#fff8f0', border: '#fed7aa', icon: AlertTriangle, color: '#ea580c' },
  tip:     { bg: '#eff6ff', border: '#bfdbfe', icon: Lightbulb,    color: '#2563eb' },
  pattern: { bg: '#fdf8ee', border: '#e8d5a0', icon: TrendingUp,   color: '#c9a84c' },
}

// ── Score Ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score, label, size = 100 }: { score: number; label: string; size?: number }) {
  const r = size * 0.38
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 75 ? '#2d7a4f' : score >= 50 ? '#c9a84c' : '#ef4444'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f0f0ee" strokeWidth={size*0.09} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
          strokeWidth={size*0.09} strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x={size/2} y={size/2 - 4} textAnchor="middle" style={{ fontSize: size*0.22, fontWeight: 700, fill: color, fontFamily: 'DM Sans, sans-serif' }}>
          {score}
        </text>
        <text x={size/2} y={size/2 + size*0.16} textAnchor="middle" style={{ fontSize: size*0.11, fill: '#aaa', fontFamily: 'DM Sans, sans-serif' }}>
          /100
        </text>
      </svg>
      <span style={{ fontSize: 11, fontWeight: 600, color, fontFamily: 'DM Sans, sans-serif' }}>{label}</span>
    </div>
  )
}

// ── Mini bar chart ────────────────────────────────────────────────────────────
function WeeklyBar({ data }: { data: Record<string, number> }) {
  const entries = ['This week', 'Last week', '3 weeks ago', '4 weeks ago']
    .map(k => ({ label: k.replace(' weeks ago', 'w ago').replace('This week', 'This').replace('Last week', 'Last'), value: data[k] ?? 0 }))
  const max = Math.max(...entries.map(e => e.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 64 }}>
      {entries.map(({ label, value }) => (
        <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#2d7a4f', opacity: value > 0 ? 1 : 0 }}>{value}</span>
          <div style={{ width: '100%', borderRadius: 4, overflow: 'hidden', height: 40, display: 'flex', alignItems: 'flex-end', background: '#f3f3f1' }}>
            <div style={{
              width: '100%', borderRadius: 4,
              height: `${Math.round((value / max) * 100)}%`,
              background: label === 'This' ? '#2d7a4f' : '#c6e6d4',
              transition: 'height 0.8s ease',
              minHeight: value > 0 ? 4 : 0,
            }} />
          </div>
          <span style={{ fontSize: 9, color: '#bbb', whiteSpace: 'nowrap' }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function InsightsPage() {
  const [tab, setTab] = useState<'week' | 'behaviour'>('week')
  const [period, setPeriod] = useState<'day' | 'week'>('week')

  const [weekly, setWeekly] = useState<WeeklyData | null>(null)
  const [weeklyLoading, setWeeklyLoading] = useState(false)
  const [weeklyError, setWeeklyError] = useState('')

  const [behaviour, setBehaviour] = useState<BehaviourData | null>(null)
  const [behaviourLoading, setBehaviourLoading] = useState(false)

  const S = { fontFamily: 'DM Sans, sans-serif' }

  const loadWeekly = useCallback(async (p: 'day'|'week') => {
    setWeeklyLoading(true)
    setWeeklyError('')
    try {
      const res = await fetch(`/api/insights?period=${p}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setWeekly(data)
    } catch (e: any) {
      setWeeklyError(e.message ?? 'Failed to load')
    } finally {
      setWeeklyLoading(false)
    }
  }, [])

  const loadBehaviour = useCallback(async () => {
    setBehaviourLoading(true)
    try {
      const res = await fetch('/api/behaviour-insights')
      const data = await res.json()
      setBehaviour(data)
    } finally {
      setBehaviourLoading(false)
    }
  }, [])

  useEffect(() => { loadWeekly(period) }, [period, loadWeekly])
  useEffect(() => {
    if (tab === 'behaviour' && !behaviour) loadBehaviour()
  }, [tab, behaviour, loadBehaviour])

  return (
    <div style={{ padding: '28px 32px 60px', maxWidth: 800, margin: '0 auto', ...S }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.02em', marginBottom: 6 }}>Insights</h1>
          <div style={{ width: 24, height: 2, background: '#c9a84c', borderRadius: 2 }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => loadWeekly(period)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, fontSize: 12, background: '#f3f3f1', border: 'none', cursor: 'pointer', color: '#666', fontFamily: 'DM Sans, sans-serif' }}>
            <RefreshCw size={12} />Refresh
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#f3f3f1', borderRadius: 10, padding: 4 }}>
        {([['week', 'This week'], ['behaviour', '4-week patterns']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 500,
            border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            background: tab === t ? '#fff' : 'transparent',
            color: tab === t ? '#1a1a1a' : '#888',
            boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* ══ WEEKLY TAB ══════════════════════════════════════════════════════════ */}
      {tab === 'week' && (
        <>
          {/* Period toggle */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {(['week', 'day'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                background: period === p ? '#2d7a4f' : '#f3f3f1',
                color: period === p ? '#fff' : '#666',
              }}>
                {p === 'week' ? 'This week' : 'Today'}
              </button>
            ))}
          </div>

          {weeklyLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '60px 0' }}>
              <Loader2 size={22} style={{ color: '#2d7a4f', animation: 'spin 1s linear infinite' }} />
              <p style={{ fontSize: 13, color: '#aaa' }}>Analysing your {period === 'week' ? 'week' : 'day'}…</p>
            </div>
          )}

          {weeklyError && (
            <div style={{ padding: '16px 18px', borderRadius: 10, background: '#fff5f5', border: '1px solid #fecaca' }}>
              <p style={{ fontSize: 13, color: '#b91c1c' }}>{weeklyError}</p>
            </div>
          )}

          {weekly && !weeklyLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Score + headline */}
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,0.07)', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 20 }}>
                <ScoreRing score={weekly.score} label={weekly.scoreLabel} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.4, marginBottom: 10 }}>
                    {weekly.headline}
                  </p>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ fontSize: 10, color: '#bbb', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Completed</p>
                      <p style={{ fontSize: 20, fontWeight: 700, color: '#2d7a4f', letterSpacing: '-0.03em' }}>{weekly.completedCount}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, color: '#bbb', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Time tracked</p>
                      <p style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.03em' }}>{fmtMins(weekly.totalMinutes)}</p>
                    </div>
                    {weekly.topProject && (
                      <div>
                        <p style={{ fontSize: 10, color: '#bbb', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Top project</p>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{weekly.topProject}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Time breakdown */}
              {weekly.timeBreakdown?.length > 0 && (
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,0.07)', padding: '18px 22px' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>Time breakdown</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {weekly.timeBreakdown.slice(0, 5).map((p, i) => (
                      <div key={p.name}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12.5, color: '#444', fontWeight: 500 }}>{p.name}</span>
                          <span style={{ fontSize: 12, color: '#888' }}>{fmtMins(p.minutes)} · {p.pct}%</span>
                        </div>
                        <div style={{ height: 5, background: '#f0f0ee', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${p.pct}%`, background: PROJECT_COLOURS[i % PROJECT_COLOURS.length], borderRadius: 3, transition: 'width 0.8s ease' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Insights */}
              {weekly.insights?.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {weekly.insights.map((ins, i) => {
                    const st = WEEKLY_STYLE[ins.type] ?? WEEKLY_STYLE.tip
                    const Icon = st.icon
                    return (
                      <div key={i} style={{ background: st.bg, border: `1px solid ${st.border}`, borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 12 }}>
                        <Icon size={15} style={{ color: st.color, flexShrink: 0, marginTop: 1 }} />
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 3 }}>{ins.title}</p>
                          <p style={{ fontSize: 12.5, color: '#555', lineHeight: 1.55 }}>{ins.detail}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Tomorrow focus */}
              {weekly.tomorrowFocus && (
                <div style={{ background: 'linear-gradient(135deg,#f0faf4,#f9fdf9)', border: '1px solid #c6e6d4', borderRadius: 12, padding: '16px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <Target size={15} style={{ color: '#2d7a4f', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#2d7a4f', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Next priority</p>
                    <p style={{ fontSize: 13.5, color: '#1f5537', fontWeight: 500, lineHeight: 1.5 }}>{weekly.tomorrowFocus}</p>
                  </div>
                </div>
              )}

              {/* Tips */}
              {weekly.tips?.length > 0 && (
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,0.07)', padding: '18px 22px' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Actionable tips</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {weekly.tips.map((tip, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#f0faf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#2d7a4f' }}>{i + 1}</span>
                        </div>
                        <p style={{ fontSize: 13, color: '#444', lineHeight: 1.55 }}>{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ══ BEHAVIOUR TAB ═══════════════════════════════════════════════════════ */}
      {tab === 'behaviour' && (
        <>
          {behaviourLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '60px 0' }}>
              <Loader2 size={22} style={{ color: '#2d7a4f', animation: 'spin 1s linear infinite' }} />
              <p style={{ fontSize: 13, color: '#aaa' }}>Analysing 4 weeks of patterns…</p>
              <p style={{ fontSize: 11, color: '#ccc' }}>This takes a few seconds</p>
            </div>
          )}

          {behaviour && !behaviourLoading && !behaviour.hasEnoughData && (
            <div style={{ padding: '40px 24px', textAlign: 'center', background: '#f9f9f7', borderRadius: 14, border: '1px solid rgba(0,0,0,0.06)' }}>
              <BarChart2 size={36} style={{ color: '#e0e0dd', margin: '0 auto 14px' }} />
              <p style={{ fontSize: 14, fontWeight: 500, color: '#888', lineHeight: 1.6 }}>{behaviour.message}</p>
            </div>
          )}

          {behaviour?.hasEnoughData && behaviour.analysis && !behaviourLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Headline + weekly score */}
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,0.07)', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 20 }}>
                <ScoreRing
                  score={behaviour.analysis.weeklyScore.score}
                  label={behaviour.analysis.weeklyScore.label}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em' }}>4-week average</span>
                    {behaviour.analysis.weeklyScore.trend === 'improving' && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#2d7a4f', fontWeight: 600 }}><TrendingUp size={12} />Improving</span>}
                    {behaviour.analysis.weeklyScore.trend === 'declining' && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#ef4444', fontWeight: 600 }}><TrendingDown size={12} />Declining</span>}
                    {behaviour.analysis.weeklyScore.trend === 'stable' && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#888', fontWeight: 600 }}><Minus size={12} />Stable</span>}
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.45 }}>
                    {behaviour.analysis.headline}
                  </p>
                </div>
              </div>

              {/* Raw stats strip */}
              {behaviour.rawStats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {[
                    { label: 'Hours tracked', value: `${behaviour.rawStats.totalHours}h`, color: '#2d7a4f' },
                    { label: 'Tasks done', value: behaviour.rawStats.tasksCompleted, color: '#2d7a4f' },
                    { label: 'Overdue', value: behaviour.rawStats.overdueCount, color: behaviour.rawStats.overdueCount > 3 ? '#ef4444' : '#888' },
                    { label: 'Peak hour', value: behaviour.rawStats.peakHour !== null ? fmtHour(behaviour.rawStats.peakHour) : '—', color: '#c9a84c' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: '#f9f9f7', borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(0,0,0,0.06)' }}>
                      <p style={{ fontSize: 10, color: '#bbb', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</p>
                      <p style={{ fontSize: 20, fontWeight: 700, color, letterSpacing: '-0.03em' }}>{value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Weekly completion trend */}
              {behaviour.rawStats?.weeklyCompletions && Object.keys(behaviour.rawStats.weeklyCompletions).length > 1 && (
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,0.07)', padding: '18px 22px' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>Tasks completed — last 4 weeks</p>
                  <WeeklyBar data={behaviour.rawStats.weeklyCompletions} />
                </div>
              )}

              {/* Behaviour patterns */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Patterns detected</p>
                {behaviour.analysis.patterns.map((p, i) => {
                  const st = PATTERN_STYLE[p.type]
                  const Icon = st.icon
                  return (
                    <div key={i} style={{ background: st.bg, border: `1px solid ${st.border}`, borderRadius: 12, padding: '16px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
                        <Icon size={15} style={{ color: st.iconColor, flexShrink: 0 }} />
                        <p style={{ fontSize: 13.5, fontWeight: 600, color: st.titleColor }}>{p.title}</p>
                      </div>
                      <p style={{ fontSize: 13, color: '#444', lineHeight: 1.6, marginBottom: 8 }}>{p.observation}</p>
                      <p style={{ fontSize: 12.5, color: '#666', lineHeight: 1.55, marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, color: '#555' }}>Impact: </span>{p.impact}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                        <Zap size={12} style={{ color: '#2d7a4f', flexShrink: 0, marginTop: 2 }} />
                        <p style={{ fontSize: 12, color: '#2d7a4f', fontWeight: 500, lineHeight: 1.5 }}>{p.suggestion}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Coaching tip */}
              {behaviour.analysis.coachingTip && (
                <div style={{ background: 'linear-gradient(135deg,#fdf8ee,#fff)', border: '1px solid #e8d5a0', borderRadius: 12, padding: '16px 18px', display: 'flex', gap: 12 }}>
                  <Sparkles size={15} style={{ color: '#c9a84c', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#c9a84c', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Coaching tip</p>
                    <p style={{ fontSize: 13.5, color: '#7a5e1a', lineHeight: 1.6, fontWeight: 500 }}>{behaviour.analysis.coachingTip}</p>
                  </div>
                </div>
              )}

              {/* Project time breakdown */}
              {behaviour.rawStats?.timeByProject && Object.keys(behaviour.rawStats.timeByProject).length > 0 && (
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,0.07)', padding: '18px 22px' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>Time by project — 4 weeks</p>
                  {(() => {
                    const entries = Object.entries(behaviour.rawStats!.timeByProject)
                    const total = entries.reduce((s, [,v]) => s + v, 0)
                    return entries.map(([name, hours], i) => (
                      <div key={name} style={{ marginBottom: i < entries.length - 1 ? 10 : 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12.5, color: '#444', fontWeight: 500 }}>{name}</span>
                          <span style={{ fontSize: 12, color: '#888' }}>{hours}h · {total > 0 ? Math.round((hours/total)*100) : 0}%</span>
                        </div>
                        <div style={{ height: 5, background: '#f0f0ee', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: total > 0 ? `${Math.round((hours/total)*100)}%` : '0%', background: PROJECT_COLOURS[i % PROJECT_COLOURS.length], borderRadius: 3, transition: 'width 0.8s ease' }} />
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              )}

              {/* Re-analyse */}
              <div style={{ textAlign: 'center', paddingTop: 4 }}>
                <button onClick={loadBehaviour} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  <RefreshCw size={12} />Re-analyse patterns
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
