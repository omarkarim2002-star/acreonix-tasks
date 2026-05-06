'use client'

import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

export function OnboardingEmailTrigger() {
  const { user, isLoaded } = useUser()

  useEffect(() => {
    if (!isLoaded || !user) return

    // Check localStorage first (fast path — avoids API call on repeat visits)
    const localKey = `welcome_sent_${user.id}`
    try {
      if (localStorage.getItem(localKey)) return
    } catch {}

    const email = user.primaryEmailAddress?.emailAddress
    if (!email) return

    // Ask server if email was already sent — server stores flag in Supabase
    // so it persists across devices, browsers, and Google OAuth re-logins
    fetch('/api/onboarding-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: user.firstName ?? '',
        email,
        userId: user.id,
      }),
    }).then(res => {
      if (res.ok) {
        // Cache locally so we don't hit the server on every page load
        try { localStorage.setItem(localKey, '1') } catch {}
      }
    }).catch(() => {})
  }, [isLoaded, user?.id])

  return null
}
