'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Trash2, Loader2, MessageCircle } from 'lucide-react'

type Comment = {
  id: string
  body: string
  authorName: string
  isOwn: boolean
  created_at: string
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function TaskComments({ taskId }: { taskId: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/tasks/${taskId}/comments`)
      .then(r => r.json())
      .then(data => { setComments(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [taskId])

  async function sendComment() {
    if (!body.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: body.trim() }),
      })
      const data = await res.json()
      setComments(prev => [...prev, { ...data, authorName: 'You', isOwn: true }])
      setBody('')
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } finally { setSending(false) }
  }

  async function deleteComment(id: string) {
    await fetch(`/api/tasks/${taskId}/comments?comment_id=${id}`, { method: 'DELETE' })
    setComments(prev => prev.filter(c => c.id !== id))
  }

  const S = { fontFamily: 'DM Sans, sans-serif' }

  return (
    <div style={{ marginTop: 24, ...S }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
        <MessageCircle size={14} style={{ color: '#aaa' }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Comments {comments.length > 0 && `(${comments.length})`}
        </span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
          <Loader2 size={16} style={{ color: '#ccc', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : comments.length === 0 ? (
        <p style={{ fontSize: 12.5, color: '#ccc', textAlign: 'center', padding: '12px 0' }}>No comments yet — be the first</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          {comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              {/* Avatar */}
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: c.isOwn ? '#2d7a4f' : '#f0f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: c.isOwn ? '#fff' : '#888' }}>
                  {c.authorName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>{c.isOwn ? 'You' : c.authorName}</span>
                  <span style={{ fontSize: 11, color: '#ccc' }}>{timeAgo(c.created_at)}</span>
                  {c.isOwn && (
                    <button onClick={() => deleteComment(c.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#e0e0de', padding: 2 }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ef4444'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#e0e0de'}>
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
                <p style={{ fontSize: 13, color: '#444', lineHeight: 1.55, margin: 0, wordBreak: 'break-word' }}>{c.body}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Send box */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendComment() }}
          placeholder="Add a comment… (⌘+Enter to send)"
          rows={2}
          style={{ flex: 1, padding: '9px 11px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 9, fontSize: 13, color: '#1a1a1a', resize: 'none', outline: 'none', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5 }}
          onFocus={e => (e.target as HTMLElement).style.borderColor = 'rgba(45,122,79,0.4)'}
          onBlur={e => (e.target as HTMLElement).style.borderColor = 'rgba(0,0,0,0.12)'}
        />
        <button onClick={sendComment} disabled={!body.trim() || sending} style={{ width: 36, height: 36, borderRadius: 9, background: !body.trim() || sending ? '#e8e8e5' : '#2d7a4f', border: 'none', cursor: !body.trim() || sending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {sending ? <Loader2 size={14} style={{ color: '#aaa', animation: 'spin 1s linear infinite' }} /> : <Send size={14} style={{ color: !body.trim() ? '#aaa' : '#fff' }} />}
        </button>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
