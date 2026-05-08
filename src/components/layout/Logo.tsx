'use client'

import Link from 'next/link'
import { useState } from 'react'

export function Logo({
  size = 'default',
  light = false,
}: {
  size?: 'default' | 'small' | 'large'
  light?: boolean
}) {
  const iconSize = size === 'small' ? 22 : size === 'large' ? 40 : 30
  const textSize = size === 'small' ? '13px' : size === 'large' ? '22px' : '15px'
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <Link href="/" className="flex items-center gap-3 hover:opacity-85 transition-opacity">
      {/* Logo mark */}
      <div
        style={{
          width: iconSize,
          height: iconSize,
          borderRadius: 6,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: imgFailed
            ? (light ? '#D7F36A' : '#0D3D2E')
            : 'transparent',
          overflow: 'hidden',
        }}
      >
        {imgFailed ? (
          <span style={{
            color: light ? '#071F17' : '#fff',
            fontWeight: 800,
            fontSize: Math.round(iconSize * 0.55),
            fontFamily: 'Georgia, serif',
          }}>A</span>
        ) : (
          <img
            src="/logo.png"
            alt="Acreonix"
            width={iconSize}
            height={iconSize}
            style={{ objectFit: 'contain', display: 'block' }}
            onError={() => setImgFailed(true)}
          />
        )}
      </div>

      {/* Wordmark */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{
          fontSize: textSize,
          fontWeight: 700,
          color: light ? '#ffffff' : '#0D3D2E',
          fontFamily: 'Georgia, serif',
          letterSpacing: '0.1em',
          textTransform: 'uppercase' as const,
        }}>
          Acreonix
        </span>
        <span style={{
          fontSize: '10px',
          color: light ? 'rgba(215,243,106,0.85)' : '#c9a84c',
          fontFamily: 'Georgia, serif',
          letterSpacing: '0.18em',
          textTransform: 'uppercase' as const,
          marginTop: 2,
        }}>
          Tasks
        </span>
      </div>
    </Link>
  )
}
