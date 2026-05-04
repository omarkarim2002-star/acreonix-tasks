'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Loader2, TrendingUp, AlertTriangle, Lightbulb, CheckCircle2, Clock, Zap, RefreshCw, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

type Insight = {
  type: 'success' | 'warning' | 'tip' | 'pattern'
  title: string
  detail: string
}

type TimeBreakdown = {
  name: string
  minutes: number
  pct: number
}

type InsightResult = {
  headline: string
  score: number
  scoreLabel: string
  completedCount: number
  totalMinutes: number
  topProject: string
  insights: Insight[]
  tips: string[]
  tomorrowFocus: string
  timeBreakdown: TimeBreakdown[]
  period: string
  generatedAt: string
}

const PROJECT_COLOURS = [
  '#2d7a4f', '#c9a84c', '#3b82f6', '#8b5cf6',
  '#ec4899', '#f97316', '#14b8a6', '#ef4444',
]

const INSIGHT_STYLES = {
  success: { bg: 'bg-[#e8f5ee]', border: 'border-[#a8d5bc]', icon: CheckCircle2, iconCol: 'text-[#2d7a4f]', label: 'text-[#2d7a4f]' },
  warning: { bg: 'bg-orange-50', border: 'border-orange-200', icon: AlertTriangle, iconCol: 'text-orange-500', label: 'text-orange-700' },
  tip: { bg: 'bg-blue-50', border: 'border-blue-200', icon: Lightbulb, iconCol: 'text-blue-500', label: 'text-blue-700' },
  pattern: { bg: 'bg-[#faf5e8]', border: 'border-[#e8d5a0]', icon: TrendingUp, iconCol: 'text-[#c9a84c]', label: 'text-[#9e7e33]' },
}

function ScoreRing({ score }: { score: number }) {
  const r = 44
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const colour = score >= 75 ? '#2d7a4f' : score >= 50 ? '#c9a84c' : '#ef4444'

  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r={r} fill="none" stroke="#f3f4f6" strokeWidth="10" />
      <circle
        cx="60" cy="60" r={r} fill="none"
        stroke={colour} strokeWidth="10"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
      <text x="60" y="56" textAnchor="middle" fontSize="22" fontWeight="700" fill="#1a1f2e">{score}</text>
      <text x="60" y="72" textAnchor="middle" fontSize="10" fill="#9ca3af">/100</text>
    </svg>
  )
}

export default function InsightsPage() {
  const [period, setPeriod] = useState<'day' | 'week'>('week')
  const [data, setData] = useState<InsightResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function load(p: 'day' | 'week') {
    setLoading(true)
    setError('')
    setData(null)
    try {
      const res = await fetch(`/api/insights?period=${p}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load insights')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(period) }, [period])

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 gold-underline" style={{ fontFamily: 'Georgia, serif' }}>Insights</h1>
          <p className="text-gray-400 text-sm mt-3">AI analysis of your productivity patterns</p>
        </div>
        <button
          onClick={() => load(period)}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />Refresh
        </button>
      </div>

      {/* Period toggle */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {(['day', 'week'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn('text-xs font-medium px-4 py-1.5 rounded-lg transition-all', period === p ? 'bg-white text-[#2d7a4f] shadow-sm' : 'text-gray-500 hover:text-gray-700')}
          >
            {p === 'day' ? 'Today' : 'This week'}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#e8f5ee' }}>
            <Sparkles size={22} style={{ color: '#2d7a4f' }} />
          </div>
          <p className="text-sm text-gray-500 mb-1">Analysing your {period === 'day' ? 'day' : 'week'}…</p>
          <p className="text-xs text-gray-400">Looking at tasks, time logs and patterns</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {data && !loading && (
        <div className="space-y-5">
          {/* Score + headline */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 flex items-center gap-6">
              <ScoreRing score={data.score} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{data.scoreLabel}</p>
                <p className="text-base font-semibold text-gray-900 leading-snug">{data.headline}</p>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-[#2d7a4f]" />
                    <span className="text-sm text-gray-700"><strong>{data.completedCount}</strong> completed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-[#c9a84c]" />
                    <span className="text-sm text-gray-700">
                      <strong>{Math.floor(data.totalMinutes / 60)}h {data.totalMinutes % 60}m</strong> tracked
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Time breakdown */}
          {data.timeBreakdown?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Time by project</h2>
              <div className="space-y-3">
                {data.timeBreakdown.sort((a, b) => b.minutes - a.minutes).map((item, i) => (
                  <div key={item.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: PROJECT_COLOURS[i % PROJECT_COLOURS.length] }} />
                        <span className="text-sm text-gray-700 truncate max-w-[200px]">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">
                          {item.minutes >= 60 ? `${Math.floor(item.minutes / 60)}h ${item.minutes % 60}m` : `${item.minutes}m`}
                        </span>
                        <span className="text-xs font-semibold text-gray-600 w-8 text-right">{item.pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${item.pct}%`, background: PROJECT_COLOURS[i % PROJECT_COLOURS.length] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Insights */}
          {data.insights?.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">AI observations</h2>
              {data.insights.map((insight, i) => {
                const style = INSIGHT_STYLES[insight.type] ?? INSIGHT_STYLES.tip
                const Icon = style.icon
                return (
                  <div key={i} className={cn('rounded-2xl border px-5 py-4', style.bg, style.border)}>
                    <div className="flex items-start gap-3">
                      <Icon size={16} className={cn('shrink-0 mt-0.5', style.iconCol)} />
                      <div>
                        <p className={cn('text-sm font-semibold mb-1', style.label)}>{insight.title}</p>
                        <p className="text-sm text-gray-600 leading-relaxed">{insight.detail}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Tips */}
          {data.tips?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Tips to improve</h2>
              <div className="space-y-3">
                {data.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-white" style={{ background: '#2d7a4f' }}>{i + 1}</div>
                    <p className="text-sm text-gray-700 leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tomorrow focus */}
          {data.tomorrowFocus && (
            <div className="rounded-2xl px-5 py-4 border" style={{ background: '#1a2744', borderColor: '#1a2744' }}>
              <div className="flex items-start gap-3">
                <Target size={16} className="text-[#c9a84c] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-[#c9a84c] uppercase tracking-wide mb-1">
                    {period === 'day' ? 'Focus next' : 'Focus tomorrow'}
                  </p>
                  <p className="text-sm text-white leading-relaxed">{data.tomorrowFocus}</p>
                </div>
              </div>
            </div>
          )}

          <p className="text-[11px] text-gray-300 text-center">
            Generated {new Date(data.generatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      )}
    </div>
  )
}
