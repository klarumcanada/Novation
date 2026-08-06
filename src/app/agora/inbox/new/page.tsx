'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import AgoraNav from '@/components/AgoraNav'
import Link from 'next/link'

const BRAND = {
  midnight: '#0D1B3E',
  navy: '#1A3266',
  electric: '#3B82F6',
  ice: '#DBEAFE',
  chalk: '#F8F7F4',
}

function ComposeForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toId = searchParams.get('to')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [recipientName, setRecipientName] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      if (!toId) { setLoadError('No recipient specified.'); setLoading(false); return }

      const res = await fetch(`/api/agora/profile/${toId}`)
      if (!res.ok) { setLoadError('Recipient not found.'); setLoading(false); return }

      const data = await res.json()
      setRecipientName(data.profile?.name ?? 'Unknown')
      setLoading(false)
    }
    init()
  }, [toId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim() || !toId) return
    setSending(true)
    setSendError(null)

    const res = await fetch('/api/agora/inbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_id: toId, subject: subject.trim() || null, body, parent_id: null }),
    })
    const data = await res.json()
    setSending(false)

    if (!data.success) {
      setSendError(data.error ?? 'Failed to send.')
      return
    }

    router.push(`/agora/inbox/${data.message.id}`)
  }

  if (loading) return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '3rem 1.5rem' }}>
      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF' }}>Loading…</p>
    </div>
  )

  if (loadError) return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '3rem 1.5rem' }}>
      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#DC2626' }}>{loadError}</p>
      <Link href="/agora/inbox" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: BRAND.electric }}>
        ← Back to inbox
      </Link>
    </div>
  )

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      <Link href="/agora/inbox" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#9CA3AF', textDecoration: 'none', display: 'inline-block', marginBottom: '1.25rem' }}>
        ← Inbox
      </Link>

      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: 600, color: BRAND.midnight, margin: '0 0 1.75rem 0' }}>
        New message to {recipientName}
      </h1>

      <form onSubmit={handleSubmit}>
        <div style={{
          background: 'white', borderRadius: '12px', border: '1px solid #E2E6F0',
          padding: '28px 28px 24px',
        }}>
          {/* Subject */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Optional subject line"
              style={{
                width: '100%', border: '1px solid #E2E6F0', borderRadius: '8px',
                padding: '10px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px',
                color: BRAND.midnight, outline: 'none', boxSizing: 'border-box',
                background: '#FAFAFA',
              }}
            />
          </div>

          {/* Body */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Message
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e as unknown as React.FormEvent) }}
              placeholder="Write your message…"
              rows={7}
              required
              style={{
                width: '100%', border: '1px solid #E2E6F0', borderRadius: '8px',
                padding: '10px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px',
                color: BRAND.midnight, lineHeight: 1.65, resize: 'vertical',
                outline: 'none', boxSizing: 'border-box', background: '#FAFAFA',
              }}
            />
          </div>

          {sendError && (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#DC2626', margin: '0 0 14px' }}>
              {sendError}
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#D1D5DB' }}>⌘↵ to send</span>
            <button
              type="submit"
              disabled={sending || !body.trim()}
              style={{
                background: body.trim() ? BRAND.electric : '#E5E7EB',
                color: body.trim() ? 'white' : '#9CA3AF',
                border: 'none', borderRadius: '8px', padding: '10px 22px',
                fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600,
                cursor: body.trim() ? 'pointer' : 'default',
              }}
            >
              {sending ? 'Sending…' : 'Send →'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default function AgoraComposePage() {
  return (
    <div style={{ background: BRAND.chalk, minHeight: '100vh', paddingBottom: '4rem' }}>
      <AgoraNav />
      <Suspense fallback={
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '3rem 1.5rem' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF' }}>Loading…</p>
        </div>
      }>
        <ComposeForm />
      </Suspense>
    </div>
  )
}
