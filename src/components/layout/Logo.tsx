import Link from 'next/link'

export function Logo({ size = 'default' }: { size?: 'default' | 'small' | 'large' }) {
  const textSize = size === 'small' ? 'text-sm' : size === 'large' ? 'text-2xl' : 'text-base'
  const iconSize = size === 'small' ? 20 : size === 'large' ? 36 : 26

  return (
    <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity" style={{ overflow: "visible" }}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 100 132"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer ring top arc: green */}
        <path
          d="M50 4C74.3 4 94 23.7 94 48 L94 52 C90 28 72 10 50 10 C28 10 10 28 6 52 L6 48 C6 23.7 25.7 4 50 4Z"
          fill="#2d7a4f"
        />
        {/* Outer ring left arc: gold */}
        <path
          d="M4 50 C4 27 18 8 38 4 L38 10 C22 14 10 30 10 50 C10 62 15 73 24 80 L18 86 C9 78 4 65 4 50Z"
          fill="#c9a84c"
        />
        {/* Outer ring right + bottom: green */}
        <path
          d="M96 50 C96 73 82 92 62 96 L62 90 C78 86 90 70 90 50 C90 38 85 27 76 20 L82 14 C91 22 96 35 96 50Z"
          fill="#2d7a4f"
        />
        {/* Bottom left quarter + stem left: gold */}
        <path
          d="M18 86 C26 96 38 103 50 104 L50 116 L44 116 L44 104 C32 103 21 96 13 87 Z"
          fill="#c9a84c"
        />
        {/* Bottom right + stem right: green */}
        <path
          d="M82 14 L76 20 C85 30 90 39 90 50 C90 70 78 86 62 96 L62 104 C74 103 86 96 94 87 Z"
          fill="#2d7a4f"
        />
        {/* Stem right half: green */}
        <path d="M50 104 L50 116 L56 116 L56 104 Z" fill="#2d7a4f"/>
        {/* Pin tip: gold */}
        <path d="M44 116 L50 128 L56 116 Z" fill="#c9a84c"/>
        {/* Centre white cutout (diamond) */}
        <rect x="28" y="28" width="44" height="44" rx="6" fill="white" transform="rotate(45 50 50)"/>
        {/* Inner circle: green */}
        <circle cx="50" cy="50" r="12" fill="#2d7a4f"/>
      </svg>
      <div className="flex flex-col leading-none">
        <span
          className={`font-bold text-[#2d7a4f] tracking-widest uppercase ${textSize}`}
          style={{ fontFamily: 'Georgia, serif', letterSpacing: '0.12em' }}
        >
          Acreonix
        </span>
        <span
          className="text-[10px] text-[#c9a84c] tracking-[0.2em] uppercase"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Tasks
        </span>
      </div>
    </Link>
  )
}
