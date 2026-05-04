'use client'

import { useState, useEffect } from 'react'
import { OnboardingFlow } from './OnboardingFlow'

export function OnboardingWrapper() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const done = localStorage.getItem('acreonix_onboarded')
    if (!done) setShow(true)
  }, [])

  if (!show) return null
  return <OnboardingFlow onComplete={() => setShow(false)} />
}
