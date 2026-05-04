'use client'

import Image from 'next/image'
import { UserButton } from '@clerk/nextjs'
import { NotificationBell } from './NotificationBell'

// Only the top header bar for mobile — no bottom nav tabs
export function MobileHeader() {
  return (
    <header className="mobile-header" style={{
      display: 'none', // overridden to flex on mobile via CSS
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      height: 54,
      background: '#fbfbfa',
      borderBottom: '1px solid rgba(0,0,0,0.07)',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      zIndex: 30,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: '#f0faf4', border: '1px solid #c6e6d4',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          overflow: 'hidden',
        }}>
          <Image src="/logo.png" alt="Acreonix" width={22} height={22} style={{ objectFit: 'contain' }} />
        </div>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.01em' }}>Acreonix</div>
          <div style={{ fontSize: 9, fontWeight: 500, color: '#c9a84c', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Tasks</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <NotificationBell />
        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  )
}

// Keep default export for any existing imports
export default MobileHeader
