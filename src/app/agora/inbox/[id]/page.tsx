'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import AgoraNav from '@/components/AgoraNav'

const BRAND = {
  midnight: '#0D1B3E',
  navy: '#1A3266',
  electric: '#3B82F6',
  ice: '#DBEAFE',
  chalk: '#F8F7F4',
}

type RawMessage = {
  id: string
  from_id: string
  to_id: string
  subject: string | null
  body: string
  created_at: string
  read_at: string | null
  parent_id: string | null
}

type Profile = {
  id: string
  name: string
  avatar_url: string | null
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const isToday = d.toDateString() === new Date().toDateString()
  return isToday
    ? d.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function initials(name: string) {
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  return parts[0]?.[0]?.toUpperCase() ?? '?'
}

export default function AgoraThreadPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [messages, setMessages] = useState<RawMessage[]>([])
  const [nameMap, setNameMap] = useState<Record<string, string>>({})
  const [userId, setUserId] = useState<string | null>(null)
  const [otherId, setOtherId] = useState<string | null>(null)
  const [subject, setSubject] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const [{ data: root }, { data: replies }] = await Promise.all([
        supabase.from('agora_messages').select('*').eq('id', id).single(),
        supabase.from('agora_messages').select('*').eq('parent_id', id).order('created_at', { ascending: true }),
        // mark as read in parallel — fire and forget
        fetch(`/api/agora/messages/${id}/read`, { method: 'POST' }),
      ] as const)

      if (!root) { setLoading(false); return }

      setSubject(root.subject)
      const other = root.from_id === user.id ? root.to_id : root.from_id
      setOtherId(other)

      const all = [root, ...(replies ?? [])]
      setMessages(all)

      const userIds = [...new Set(all.flatMap(m => [m.from_id, m.to_id]))]
      const { data: profiles } = await supabase
        .from('agora_profiles')
        .select('id, name')
        .in('id', userIds)

      setNameMap(Object.fromEntries((profiles ?? []).map((p: Profile) => [p.id, p.name])))
      setLoading(false)
    }

    load()
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendReply() {
    if (!replyBody.trim() || !otherId) return
    setSending(true)
    setSendError(null)

    const res = await fetch('/api/agora/inbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_id: otherId, body: replyBody, parent_id: id }),
    })
    const data = await res.json()
    setSending(false)

    if (!data.success) {
      setSendError(data.error ?? 'Failed to send.')
      return
    }

    setMessages(prev => [...prev, data.message])
    setReplyBody('')
  }

  if (loading) return (
    <div style={{ background: BRAND.chalk, minHeight: '100vh' }}>
      <AgoraNav />
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF' }}>Loading…</p>
      </div>
    </div>
  )

  if (messages.length === 0) return (
    <div style={{ background: BRAND.chalk, minHeight: '100vh' }}>
      <AgoraNav />
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF' }}>Thread not found.</p>
      </div>
    </div>
  )

  const otherName = otherId ? (nameMap[otherId] ?? 'Unknown') : 'Unknown'

  return (
    <div style={{ background: BRAND.chalk, minHeight: '100vh', paddingBottom: '8rem' }}>
      <AgoraNav />

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>

        {/* Back + header */}
        <Link href="/agora/inbox" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#9CA3AF', textDecoration: 'none', display: 'inline-block', marginBottom: '1.25rem' }}>
          ← Inbox
        </Link>

        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: 600, color: BRAND.midnight, margin: '0 0 4px 0' }}>
            {otherName}
          </h1>
          {subject && (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#9CA3AF', margin: 0 }}>
              {subject}
            </p>
          )}
        </div>

        {/* Message bubbles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '1.5rem' }}>
          {messages.map(msg => {
            const isMe = msg.from_id === userId
            const senderName = nameMap[msg.from_id] ?? 'Unknown'

            return (
              <div
                key={msg.id}
                style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}
              >
                <div style={{
                  display: 'flex', gap: '10px', alignItems: 'flex-end',
                  flexDirection: isMe ? 'row-reverse' : 'row',
                  maxWidth: '82%',
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                    background: isMe ? BRAND.electric : '#E2E6F0',
                    color: isMe ? 'white' : BRAND.midnight,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
                  }}>
                    {initials(senderName)}
                  </div>

                  {/* Bubble + timestamp */}
                  <div>
                    <div style={{
                      background: isMe ? BRAND.ice : 'white',
                      border: isMe ? `1px solid ${BRAND.electric}44` : '1px solid #E2E6F0',
                      borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                      padding: '12px 16px',
                      fontFamily: 'DM Sans, sans-serif', fontSize: '14px',
                      color: BRAND.midnight, lineHeight: 1.65,
                    }}>
                      {msg.body}
                    </div>
                    <div style={{
                      fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#9CA3AF',
                      marginTop: '4px', textAlign: isMe ? 'right' : 'left',
                    }}>
                      {senderName} · {formatTime(msg.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Reply box */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: BRAND.chalk, borderTop: '1px solid #E2E6F0',
          padding: '1rem',
        }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <div style={{
              background: 'white', borderRadius: '12px', border: '1px solid #E2E6F0',
              padding: '12px 14px',
            }}>
              <textarea
                value={replyBody}
                onChange={e => setReplyBody(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply() }}
                placeholder="Write a reply…"
                rows={2}
                style={{
                  width: '100%', border: 'none', outline: 'none', resize: 'none',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: BRAND.midnight,
                  lineHeight: 1.65, background: 'transparent', boxSizing: 'border-box',
                }}
              />
              {sendError && (
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#DC2626', margin: '4px 0 6px' }}>
                  {sendError}
                </p>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#D1D5DB' }}>⌘↵ to send</span>
                <button
                  onClick={sendReply}
                  disabled={sending || !replyBody.trim()}
                  style={{
                    background: replyBody.trim() ? BRAND.electric : '#E5E7EB',
                    color: replyBody.trim() ? 'white' : '#9CA3AF',
                    border: 'none', borderRadius: '8px', padding: '8px 18px',
                    fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600,
                    cursor: replyBody.trim() ? 'pointer' : 'default',
                  }}
                >
                  {sending ? 'Sending…' : 'Send →'}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
