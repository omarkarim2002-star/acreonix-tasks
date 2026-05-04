import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function HomePage() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#2d7a4f] tracking-widest uppercase" style={{fontFamily:'Georgia,serif'}}>Acreonix</span>
          <span className="text-xs text-[#c9a84c] tracking-widest uppercase" style={{fontFamily:'Georgia,serif'}}>Tasks</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/sign-in" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">Sign in</Link>
          <Link href="/sign-up" className="text-sm bg-[#2d7a4f] text-white px-4 py-1.5 rounded-lg hover:bg-[#1f5537] transition-colors font-medium">Get started</Link>
        </div>
      </nav>
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <h1 className="text-5xl font-bold text-gray-900 max-w-2xl leading-tight mb-6" style={{fontFamily:'Georgia,serif'}}>
          Stop context-switching.<br/><span className="text-[#2d7a4f]">Start finishing.</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mb-10">Paste your tasks in plain English. AI organises them into projects and schedules your day.</p>
        <Link href="/sign-up" className="bg-[#2d7a4f] text-white px-8 py-3.5 rounded-xl font-medium hover:bg-[#1f5537] transition-colors">
          Start for free
        </Link>
      </section>
    </main>
  )
}
