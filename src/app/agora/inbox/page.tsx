'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
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

type Thread = {
  id: string
  subject: string | null
  body: string
  created_at: string
  last_activity: string
  read_at: string | null
  reply_count: number
  is_unread: boolean
  from: { id: string; name: string }
  to: { id: string; name: string }
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

function initials(name: string) {
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  return parts[0]?.[0]?.toUpperCase() ?? '?'
}

export default function AgoraInboxPage() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [threads, setThreads] = useState<Thread[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const userIdRef = useRef<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadThreads() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    userIdRef.current = user.id
    setUserId(user.id)
    const res = await fetch('/api/agora/inbox', { cache: 'no-store' })
    const data = await res.json()
    setThreads(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => {
    loadThreads()
  }, [])

  useEffect(() => {
    const onFocus = () => loadThreads()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const uid = userIdRef.current ?? userId
  const unreadCount = threads.filter(t => t.is_unread).length

  return (
    <div style={{ background: BRAND.chalk, minHeight: '100vh', paddingBottom: '4rem' }}>
      <AgoraNav />

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '26px', fontWeight: 600, color: BRAND.midnight, margin: 0 }}>
            Messages
            {unreadCount > 0 && (
              <span style={{
                marginLeft: '10px', background: BRAND.electric, color: 'white',
                fontSize: '12px', fontWeight: 700, borderRadius: '100px',
                padding: '2px 8px', fontFamily: 'DM Sans, sans-serif', verticalAlign: 'middle',
              }}>
                {unreadCount}
              </span>
            )}
          </h1>
          <Link href="/agora/inbox/new" style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500,
            color: 'white', background: BRAND.electric, padding: '8px 16px',
            borderRadius: '8px', textDecoration: 'none',
          }}>
            + New message
          </Link>
        </div>

        {loading ? (
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF' }}>Loading…</p>
        ) : threads.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E6F0', padding: '3rem', textAlign: 'center' }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF', margin: 0 }}>
              No messages yet. When someone reaches out, they'll appear here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {threads.map(thread => {
              const other = thread.from.id === uid ? thread.to : thread.from
              const isUnread = thread.is_unread

              return (
                <button
                  key={thread.id}
                  onClick={() => router.push(`/agora/inbox/${thread.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
                    textAlign: 'left', background: 'white', borderRadius: '12px',
                    border: '1px solid #E2E6F0',
                    borderLeft: isUnread ? `3px solid ${BRAND.electric}` : '3px solid transparent',
                    padding: '14px 16px', cursor: 'pointer',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                    background: BRAND.ice, color: BRAND.navy,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
                  }}>
                    {initials(other.name)}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
                      <span style={{
                        fontFamily: 'DM Sans, sans-serif', fontSize: '14px',
                        fontWeight: isUnread ? 600 : 400, color: BRAND.midnight,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {other.name}
                      </span>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#9CA3AF', flexShrink: 0, marginLeft: '12px' }}>
                        {timeAgo(thread.last_activity)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ minWidth: 0 }}>
                        <span style={{
                          fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
                          fontWeight: isUnread ? 500 : 400, color: isUnread ? BRAND.midnight : '#6B7280',
                          display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {thread.subject ?? 'No subject'}
                        </span>
                        <span style={{
                          fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#9CA3AF',
                          display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {thread.body.length > 72 ? thread.body.slice(0, 72) + '…' : thread.body}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '12px' }}>
                        {thread.reply_count > 0 && (
                          <span style={{
                            fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#6B7280',
                            background: '#F3F4F6', borderRadius: '100px', padding: '2px 7px',
                          }}>
                            {thread.reply_count + 1}
                          </span>
                        )}
                        {isUnread && (
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: BRAND.electric, flexShrink: 0 }} />
                        )}
                      </div>
                    </div>
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
