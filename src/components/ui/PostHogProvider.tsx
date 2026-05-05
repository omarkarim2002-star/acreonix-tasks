'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

// Track key product events
export const track = {
  taskExtracted:   (count: number) => posthog.capture('task_extracted', { task_count: count }),
  taskCreated:     () => posthog.capture('task_created'),
  taskCompleted:   () => posthog.capture('task_completed'),
  scheduleRan:     (type: 'week' | 'today') => posthog.capture('ai_schedule_ran', { type }),
  calendarImport:  (count: number) => posthog.capture('calendar_imported', { event_count: count }),
  upgradeClicked:  (plan: string) => posthog.capture('upgrade_clicked', { plan }),
  topUpClicked:    (tier: string) => posthog.capture('topup_clicked', { tier }),
  nudgeDismissed:  (type: string) => posthog.capture('nudge_dismissed', { type }),
  voiceUsed:       () => posthog.capture('voice_input_used'),
  mindmapOpened:   () => posthog.capture('mindmap_opened'),
  checkInCompleted:() => posthog.capture('daily_checkin_completed'),
  projectMerged:   () => posthog.capture('project_merged'),
  csvExported:     (count: number) => posthog.capture('csv_exported', { task_count: count }),
}

function PostHogIdentify() {
  const { user, isLoaded } = useUser()
  useEffect(() => {
    if (!isLoaded || !user) return
    posthog.identify(user.id, {
      email: user.primaryEmailAddress?.emailAddress,
      name: [user.firstName, user.lastName].filter(Boolean).join(' '),
      created_at: user.createdAt,
    })
  }, [isLoaded, user])
  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key) return
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      session_recording: { maskAllInputs: true },
    })
  }, [])

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return <>{children}</>

  return (
    <PHProvider client={posthog}>
      <PostHogIdentify />
      {children}
    </PHProvider>
  )
}
