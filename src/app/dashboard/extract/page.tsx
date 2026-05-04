'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'

export default function ExtractPage() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{summary:string;projectsCreated:number;tasksCreated:number}|null>(null)
  const [error, setError] = useState('')

  async function handleExtract() {
    if (!text.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/extract-tasks', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
    } catch(e:unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally { setLoading(false) }
  }

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2" style={{fontFamily:'Georgia,serif'}}>Add tasks with AI</h1>
        <p className="text-gray-500 text-sm">Paste anything — notes, emails, a brain dump. AI extracts and organises everything.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4">
        <textarea value={text} onChange={(e)=>setText(e.target.value)}
          placeholder="e.g. Need to finish the client proposal by Friday, fix the login bug, book a call with James, pay the Supabase invoice..."
          className="w-full p-5 text-sm text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none min-h-[180px]"
          rows={8} disabled={loading} />
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
          <span className="text-xs text-gray-400">{text.length} characters</span>
          <button onClick={handleExtract} disabled={!text.trim()||loading}
            className="flex items-center gap-2 bg-[#2d7a4f] text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-[#1f5537] transition-colors disabled:opacity-50">
            {loading ? <><Loader2 size={14} className="animate-spin"/>Extracting…</> : <><Sparkles size={14}/>Extract tasks</>}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
          <AlertCircle size={16} className="text-red-500 shrink-0" /><p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <div>
          <div className="bg-[#e8f5ee] border border-[#a8d5bc] rounded-2xl px-5 py-4 mb-4">
            <div className="flex items-center gap-2 mb-2"><CheckCircle2 size={18} className="text-[#2d7a4f]"/><span className="font-semibold text-[#2d7a4f]">Tasks extracted!</span></div>
            <p className="text-sm text-gray-700 mb-3">{result.summary}</p>
            <div className="flex gap-4 text-sm">
              <span className="text-gray-600"><strong className="text-gray-900">{result.tasksCreated}</strong> tasks</span>
              <span className="text-gray-600"><strong className="text-gray-900">{result.projectsCreated}</strong> projects</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={()=>{setResult(null);setText('')}} className="flex-1 text-sm border border-gray-200 text-gray-600 px-4 py-2.5 rounded-lg hover:bg-gray-50">Add more</button>
            <button onClick={()=>router.push('/dashboard/tasks')} className="flex-1 text-sm bg-[#2d7a4f] text-white px-4 py-2.5 rounded-lg hover:bg-[#1f5537] flex items-center justify-center gap-2">
              View tasks <ArrowRight size={14}/>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
