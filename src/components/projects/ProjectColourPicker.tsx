'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

const COLOURS = [
  '#2d7a4f', '#c9a84c', '#3b82f6', '#8b5cf6',
  '#ec4899', '#f97316', '#14b8a6', '#ef4444',
  '#84cc16', '#06b6d4', '#f59e0b', '#6366f1',
]

const EMOJIS = [
  '📁','🚀','💼','🎯','⚡','🌟','🔧','📊',
  '🎨','💡','🏆','📝','🔬','🎵','🌱','🏗️',
  '💻','📱','🎬','🛒','✈️','🏠','📚','🔑',
]

interface Props {
  colour: string
  icon: string
  onChange: (colour: string, icon: string) => void
}

export function ProjectColourPicker({ colour, icon, onChange }: Props) {
  const [tab, setTab] = useState<'colour' | 'icon'>('colour')

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-lg w-64">
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setTab('colour')}
          className={cn('flex-1 text-xs font-medium py-2.5 transition-colors', tab === 'colour' ? 'text-[#2d7a4f] bg-[#e8f5ee]' : 'text-gray-500 hover:bg-gray-50')}
        >
          Colour
        </button>
        <button
          onClick={() => setTab('icon')}
          className={cn('flex-1 text-xs font-medium py-2.5 transition-colors', tab === 'icon' ? 'text-[#2d7a4f] bg-[#e8f5ee]' : 'text-gray-500 hover:bg-gray-50')}
        >
          Icon
        </button>
      </div>

      <div className="p-3">
        {tab === 'colour' ? (
          <div className="grid grid-cols-6 gap-2">
            {COLOURS.map((c) => (
              <button
                key={c}
                onClick={() => onChange(c, icon)}
                className={cn('w-8 h-8 rounded-full transition-transform hover:scale-110', colour === c && 'ring-2 ring-offset-2 ring-gray-400 scale-110')}
                style={{ background: c }}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-1">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => onChange(colour, e)}
                className={cn('w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all hover:bg-gray-100', icon === e && 'bg-[#e8f5ee] ring-1 ring-[#2d7a4f]')}
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-3 pb-3 flex items-center gap-2 border-t border-gray-100 pt-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: colour + '22' }}>
          {icon}
        </div>
        <span className="text-xs text-gray-500">Preview</span>
        <div className="ml-auto w-4 h-4 rounded-full" style={{ background: colour }} />
      </div>
    </div>
  )
}
