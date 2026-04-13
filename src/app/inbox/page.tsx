'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import NovationNav from '@/components/NovationNav'

const BRAND = {
  midnight: '#0D1B3E',
  electric: '#3B82F6',
  chalk: '#F0EDE7',
}

type Thread = {
  id: string
  subject: string | null
  body: string
  created_at: string
  last_activity: string
  read_at: string | null
  reply_count: number
  is_unread: boolean
  from: { id: string; full_name: string }
  to: { id: string; full_name: string }
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function InboxPage() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [threads, setThreads] = useState<Thread[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'inbox' | 'sent'>('inbox')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const res = await fetch('/api/messages')
      const data = await res.json()
      setThreads(Array.isArray(data) ? data : [])
      setLoading(false)
    }
    load()
  }, [])

  const inbox = threads.filter(t => t.to.id === userId)
  const sent = threads.filter(t => t.from.id === userId)
  const unreadCount = inbox.filter(t => t.is_unread).length
  const visible = tab === 'inbox' ? inbox : sent

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 20px',
    fontSize: '13px',
    fontFamily: 'DM Sans, sans-serif',
    fontWeight: active ? 600 : 400,
    color: active ? BRAND.midnight : '#9CA3AF',
    background: 'none',
    border: 'none',
    borderBottom: active ? `2px solid ${BRAND.electric}` : '2px solid transparent',
    cursor: 'pointer',
    transition: 'all .15s',
  })

  return (
    <div style={{ background: BRAND.chalk, minHeight: '100vh', paddingBottom: '4rem' }}>
      <NovationNav unreadCount={unreadCount} />

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>

        {/* Header */}
        <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '26px', fontWeight: 600, color: BRAND.midnight, margin: '0 0 1.5rem 0' }}>
          Messages
        </h1>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E2E6F0', marginBottom: '1.5rem' }}>
          <button style={tabStyle(tab === 'inbox')} onClick={() => setTab('inbox')}>
            Inbox {unreadCount > 0 && (
              <span style={{
                marginLeft: '6px', background: BRAND.electric, color: 'white',
                fontSize: '10px', fontWeight: 700, borderRadius: '100px',
                padding: '1px 6px', lineHeight: '16px',
              }}>
                {unreadCount}
              </span>
            )}
          </button>
          <button style={tabStyle(tab === 'sent')} onClick={() => setTab('sent')}>
            Sent
          </button>
        </div>

        {/* Thread list */}
        {loading ? (
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF' }}>Loading…</p>
        ) : visible.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E6F0', padding: '3rem', textAlign: 'center' }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF', margin: 0 }}>
              {tab === 'inbox' ? "No messages yet. When advisors reach out, they'll appear here." : 'No sent messages yet.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {visible.map(thread => {
              const isUnread = thread.is_unread && tab === 'inbox'
              const other = tab === 'inbox' ? thread.from : thread.to

              return (
                <button
                  key={thread.id}
                  onClick={() => router.push(`/inbox/${thread.id}`)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    background: 'white', borderRadius: '12px',
                    border: isUnread ? `1px solid ${BRAND.electric}` : '1px solid #E2E6F0',
                    borderLeft: isUnread ? `3px solid ${BRAND.electric}` : '3px solid transparent',
                    padding: '1rem 1.25rem',
                    cursor: 'pointer', transition: 'box-shadow .15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,.06)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: isUnread ? 600 : 400, color: BRAND.midnight }}>
                      {tab === 'sent' ? `To: ${other.full_name}` : other.full_name}
                    </span>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#9CA3AF', flexShrink: 0, marginLeft: '12px' }}>
                      {timeAgo(thread.last_activity)}
                    </span>
                  </div>

                  {thread.subject && (
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '2px' }}>
                      {thread.subject}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#9CA3AF' }}>
                      {thread.body.length > 80 ? thread.body.slice(0, 80) + '…' : thread.body}
                    </span>
                    {thread.reply_count > 0 && (
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#6B7280', background: '#F3F4F6', borderRadius: '100px', padding: '2px 8px', marginLeft: '12px', flexShrink: 0 }}>
                        {thread.reply_count + 1} messages
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}