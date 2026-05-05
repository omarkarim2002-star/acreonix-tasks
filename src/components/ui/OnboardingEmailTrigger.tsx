'use client'

import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

const KEY = 'acreonix_welcome_email_sent'

export function OnboardingEmailTrigger() {
  const { user, isLoaded } = useUser()

  useEffect(() => {
    if (!isLoaded || !user) return
    try {
      if (localStorage.getItem(KEY)) return
    } catch {}

    const email = user.primaryEmailAddress?.emailAddress
    if (!email) return

    // Send welcome email once
    fetch('/api/onboarding-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: user.firstName ?? '',
        email,
      }),
    }).then(() => {
      try { localStorage.setItem(KEY, '1') } catch {}
    }).catch(() => {})
  }, [isLoaded, user])

  return null
}
