import Link from 'next/link'
export function Logo({ size = 'default' }: { size?: 'default' | 'small' }) {
  return (
    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
      <div className="flex flex-col leading-none">
        <span className={`font-bold text-[#2d7a4f] tracking-widest uppercase ${size === 'small' ? 'text-sm' : 'text-base'}`} style={{fontFamily:'Georgia,serif'}}>Acreonix</span>
        <span className="text-[10px] text-[#c9a84c] tracking-[0.2em] uppercase" style={{fontFamily:'Georgia,serif'}}>Tasks</span>
      </div>
    </Link>
  )
}
