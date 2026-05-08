'use client'

import Link from 'next/link'
import { useState } from 'react'

export function Logo({ size = 'default', light = false }: {
  size?: 'default' | 'small' | 'large'
  light?: boolean
}) {
  const iconSize  = size === 'small' ? 22 : size === 'large' ? 38 : 28
  const textSize  = size === 'small' ? '13px' : size === 'large' ? '18px' : '14px'
  const [failed, setFailed] = useState(false)

  return (
    <Link href="/" className="flex items-center gap-2.5 hover:opacity-85 transition-opacity">
      {/* Logo image — falls back to styled initial */}
      <div style={{
        width: iconSize, height: iconSize, borderRadius: 6,
        overflow: 'hidden', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: failed ? (light ? '#D7F36A' : '#0D3D2E') : 'transparent',
      }}>
        {failed ? (
          <span style={{
            color: light ? '#071F17' : '#fff',
            fontWeight: 800, fontSize: Math.round(iconSize * 0.55),
          }}>A</span>
        ) : (
          <img
            src="/logo.png"
            alt="Acreonix"
            width={iconSize}
            height={iconSize}
            style={{ objectFit: 'contain', display: 'block' }}
            onError={() => setFailed(true)}
          />
        )}
      </div>

      {/* Wordmark */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{
          fontSize: textSize, fontWeight: 800,
          color: light ? '#ffffff' : '#0D3D2E',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
          letterSpacing: '0.18em', textTransform: 'uppercase' as const,
        }}>Acreonix</span>
        <span style={{
          fontSize: '9px', fontWeight: 700,
          color: light ? 'rgba(215,243,106,0.85)' : '#c9a84c',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
          letterSpacing: '0.3em', textTransform: 'uppercase' as const, marginTop: 2,
        }}>Tasks</span>
      </div>
    </Link>
  )
}
