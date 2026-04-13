'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import NovationNav from '@/components/NovationNav'

const BRAND = {
  midnight: '#0D1B3E',
  electric: '#3B82F6',
  chalk: '#F0EDE7',
  ice: '#DBEAFE',
  navy: '#1A3266',
  voltage: '#E8C547',
}

type Message = {
  id: string
  subject: string | null
  body: string
  created_at: string
  read_at: string | null
  parent_id: string | null
  from: { id: string; full_name: string }
  to: { id: string; full_name: string }
}

type AdvisorProfile = {
  id: string
  full_name: string
  province: string
  years_in_practice: number
  intent: string
  aum: number | null
  book_value: number | null
  client_count: number | null
  acquisition_budget: number | null
  acquisition_timeline: string | null
  transition_duration: string | null
  willing_to_stay: boolean | null
  specialties: string[]
  carrier_affiliations: string[]
  bio: string | null
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-CA', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function formatMoney(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toLocaleString()}`
}

export default function ThreadPage() {
  const router = useRouter()
  const { threadId } = useParams<{ threadId: string }>()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [thread, setThread] = useState<Message | null>(null)
  const [replies, setReplies] = useState<Message[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [otherAdvisor, setOtherAdvisor] = useState<AdvisorProfile | null>(null)
  const [deal, setDeal] = useState<{ id: string; status: string } | null>(null)
  const [creatingDeal, setCreatingDeal] = useState(false)
  const [dealError, setDealError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: root } = await supabase
        .from('messages')
        .select('id, subject, body, created_at, read_at, parent_id, from_id, to_id')
        .eq('id', threadId)
        .single()

      const { data: replyData } = await supabase
        .from('messages')
        .select('id, subject, body, created_at, read_at, parent_id, from_id, to_id')
        .eq('parent_id', threadId)
        .order('created_at', { ascending: true })

      if (!root) { setLoading(false); return }

      const allIds = [...new Set([
        root.from_id, root.to_id,
        ...(replyData ?? []).flatMap((r: any) => [r.from_id, r.to_id])
      ])]

      const { data: advisors } = await supabase
        .from('advisors')
        .select('id, full_name')
        .in('id', allIds)

      const advisorMap = Object.fromEntries((advisors ?? []).map((a: any) => [a.id, a.full_name]))

      const hydrate = (msg: any): Message => ({
        ...msg,
        from: { id: msg.from_id, full_name: advisorMap[msg.from_id] ?? 'Unknown' },
        to: { id: msg.to_id, full_name: advisorMap[msg.to_id] ?? 'Unknown' },
      })

      const hydratedRoot = hydrate(root)
      setThread(hydratedRoot)
      setReplies((replyData ?? []).map(hydrate))

      // Fetch the other advisor's full profile
      const otherId = root.from_id === user.id ? root.to_id : root.from_id

      const { data: profile } = await supabase
        .from('advisors')
        .select('id, full_name, province, years_in_practice, intent, aum, book_value, client_count, acquisition_budget, acquisition_timeline, transition_duration, willing_to_stay, specialties, carrier_affiliations, bio')
        .eq('id', otherId)
        .single()

      setOtherAdvisor(profile ?? null)

      // Check if a deal already exists between these two advisors
      const { data: existingDeal } = await supabase
        .from('deals')
        .select('id, status')
        .or(`and(seller_id.eq.${user.id},buyer_id.eq.${otherId}),and(seller_id.eq.${otherId},buyer_id.eq.${user.id})`)
        .maybeSingle()

      setDeal(existingDeal ?? null)
      setLoading(false)

      await fetch(`/api/messages/${threadId}/read`, { method: 'POST' })
    }
    load()
  }, [threadId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [replies])

  async function handleReply() {
    if (!reply.trim() || !thread) return
    setError(null)
    setSending(true)

    const other = thread.from.id === userId ? thread.to : thread.from

    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to_id: other.id,
        subject: thread.subject,
        body: reply,
        parent_id: threadId,
      }),
    })

    setSending(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to send.')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    const { data: advisor } = await supabase
      .from('advisors')
      .select('full_name')
      .eq('id', user!.id)
      .single()

    setReplies(prev => [...prev, {
      id: crypto.randomUUID(),
      subject: thread.subject,
      body: reply,
      created_at: new Date().toISOString(),
      read_at: null,
      parent_id: threadId,
      from: { id: userId!, full_name: advisor?.full_name ?? 'You' },
      to: other,
    }])
    setReply('')
  }

  async function handleCreateDeal() {
    if (!thread || !otherAdvisor) return
    setCreatingDeal(true)
    setDealError(null)
    const other = thread.from.id === userId ? thread.to : thread.from
    const res = await fetch('/api/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ other_id: other.id, thread_id: threadId }),
    })
    const data = await res.json()
    setCreatingDeal(false)
    if (!res.ok) { setDealError(data.error ?? 'Failed to create deal.'); return }
    setDeal(data.deal)
  }

  if (loading) return (
    <div style={{ background: BRAND.chalk, minHeight: '100vh' }}>
      <NovationNav />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF' }}>Loading…</p>
      </div>
    </div>
  )

  if (!thread) return (
    <div style={{ background: BRAND.chalk, minHeight: '100vh' }}>
      <NovationNav />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF' }}>Thread not found.</p>
      </div>
    </div>
  )

  const allMessages = [thread, ...replies]
  const isSeller = otherAdvisor?.intent === 'selling'
  const accentColor = isSeller ? BRAND.voltage : BRAND.electric

  return (
    <div style={{ background: BRAND.chalk, minHeight: '100vh', paddingBottom: '6rem' }}>
      <NovationNav />

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>

        {/* Back */}
        <button
          onClick={() => router.push('/inbox')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif', marginBottom: '1.5rem', padding: 0 }}
        >
          ← Inbox
        </button>

        {/* Subject */}
        <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '22px', fontWeight: 600, color: BRAND.midnight, margin: '0 0 2rem 0' }}>
          {thread.subject ?? 'Message'}
        </h1>

        {/* Two-column layout */}
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>

          {/* Left: messages + reply */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '1.5rem' }}>
              {allMessages.map(msg => {
                const isMe = msg.from.id === userId
                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexDirection: isMe ? 'row-reverse' : 'row', maxWidth: '86%' }}>
                      <div style={{
                        width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                        background: isMe ? BRAND.midnight : '#E2E6F0',
                        color: isMe ? 'white' : BRAND.midnight,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
                      }}>
                        {initials(msg.from.full_name)}
                      </div>
                      <div>
                        <div style={{
                          background: isMe ? BRAND.midnight : 'white',
                          color: isMe ? 'white' : '#1F2937',
                          borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                          border: isMe ? 'none' : '1px solid #E2E6F0',
                          padding: '12px 16px',
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: '14px',
                          lineHeight: '1.65',
                        }}>
                          {msg.body}
                        </div>
                        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#9CA3AF', marginTop: '4px', textAlign: isMe ? 'right' : 'left' }}>
                          {formatTime(msg.created_at)}
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
              background: 'white', borderRadius: '12px', border: '1px solid #E2E6F0', padding: '1.25rem',
              position: 'sticky', bottom: '1.5rem',
              boxShadow: '0 4px 24px rgba(0,0,0,.08)',
            }}>
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleReply() }}
                placeholder="Write a reply…"
                rows={3}
                style={{
                  width: '100%', border: 'none', outline: 'none', resize: 'none',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#1F2937',
                  lineHeight: '1.65', background: 'transparent', boxSizing: 'border-box',
                }}
              />
              {error && <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#DC2626', margin: '4px 0 8px' }}>{error}</p>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#D1D5DB', alignSelf: 'center' }}>⌘↵ to send</span>
                <button
                  onClick={handleReply}
                  disabled={sending || !reply.trim()}
                  style={{
                    background: reply.trim() ? BRAND.midnight : '#E5E7EB',
                    color: reply.trim() ? 'white' : '#9CA3AF',
                    border: 'none', borderRadius: '8px', padding: '8px 18px',
                    fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600,
                    cursor: reply.trim() ? 'pointer' : 'default', transition: 'all .15s',
                  }}
                >
                  {sending ? 'Sending…' : 'Send →'}
                </button>
              </div>
            </div>
          </div>

          {/* Right: advisor sidebar */}
          {otherAdvisor && (
            <div style={{ width: '280px', flexShrink: 0 }}>
              <div style={{
                background: 'white', borderRadius: '12px', border: '1px solid #E2E6F0',
                overflow: 'hidden', position: 'sticky', top: '1.5rem',
              }}>
                <div style={{ height: '4px', background: accentColor }} />

                <div style={{ padding: '1.25rem' }}>

                  {/* Name + badge */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                      <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '16px', fontWeight: 600, color: BRAND.midnight, lineHeight: 1.3 }}>
                        {otherAdvisor.full_name}
                      </div>
                      <span style={{
                        padding: '3px 8px', fontSize: '10px', fontFamily: 'DM Sans, sans-serif',
                        borderRadius: '20px', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0,
                        background: isSeller ? '#FEF9EC' : BRAND.ice,
                        color: isSeller ? '#92400E' : BRAND.navy,
                        border: `1px solid ${accentColor}`,
                      }}>
                        {isSeller ? 'Seller' : 'Buyer'}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#6B7280' }}>
                      {otherAdvisor.province} · {otherAdvisor.years_in_practice} yrs
                    </div>
                  </div>

                  {/* Key stats */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
                    {isSeller ? (
                      <>
                        {otherAdvisor.book_value && <StatRow label="Book Value" value={formatMoney(otherAdvisor.book_value)} highlight />}
                        {!otherAdvisor.book_value && otherAdvisor.aum && <StatRow label="AUM" value={formatMoney(otherAdvisor.aum)} />}
                        {otherAdvisor.client_count && <StatRow label="Clients" value={otherAdvisor.client_count.toLocaleString()} />}
                        {otherAdvisor.transition_duration && <StatRow label="Timeline" value={otherAdvisor.transition_duration} />}
                        {otherAdvisor.willing_to_stay && <StatRow label="Stay-on" value="Open to staying" />}
                      </>
                    ) : (
                      <>
                        {otherAdvisor.acquisition_budget && <StatRow label="Budget" value={formatMoney(otherAdvisor.acquisition_budget)} />}
                        {otherAdvisor.acquisition_timeline && <StatRow label="Timeline" value={otherAdvisor.acquisition_timeline} />}
                      </>
                    )}
                  </div>

                  {/* Bio */}
                  {otherAdvisor.bio && (
                    <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '1rem', marginBottom: '1rem' }}>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '6px' }}>About</div>
                      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#374151', lineHeight: 1.65, margin: 0 }}>
                        {otherAdvisor.bio.length > 160 ? otherAdvisor.bio.slice(0, 160) + '…' : otherAdvisor.bio}
                      </p>
                    </div>
                  )}

                  {/* Specialties */}
                  {otherAdvisor.specialties?.length > 0 && (
                    <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '1rem', marginBottom: '1rem' }}>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Specialties</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {otherAdvisor.specialties.map(s => (
                          <span key={s} style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', padding: '3px 8px', borderRadius: '100px', background: BRAND.ice, color: BRAND.navy, border: '1px solid rgba(59,130,246,.2)' }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* View full profile */}
                  <button
                    onClick={() => router.push(`/marketplace/${otherAdvisor.id}`)}
                    style={{
                      width: '100%', padding: '9px', fontSize: '12px', fontWeight: 600,
                      fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', cursor: 'pointer',
                      border: `1.5px solid ${BRAND.electric}`, background: 'white', color: BRAND.electric,
                      transition: 'all .15s', marginBottom: '8px',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = BRAND.ice }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'white' }}
                  >
                    View full profile →
                  </button>

                  {/* Deal action */}
                  <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '1rem' }}>
                    {deal ? (
                      <button
                        onClick={() => router.push('/deals')}
                        style={{
                          width: '100%', padding: '9px', fontSize: '12px', fontWeight: 600,
                          fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', cursor: 'pointer',
                          border: 'none', background: BRAND.midnight, color: 'white',
                        }}
                      >
                        View deal →
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handleCreateDeal}
                          disabled={creatingDeal}
                          style={{
                            width: '100%', padding: '9px', fontSize: '12px', fontWeight: 600,
                            fontFamily: 'DM Sans, sans-serif', borderRadius: '8px',
                            cursor: creatingDeal ? 'not-allowed' : 'pointer',
                            border: 'none', background: BRAND.electric, color: 'white',
                          }}
                        >
                          {creatingDeal ? 'Creating…' : 'Express interest in a deal'}
                        </button>
                        {dealError && (
                          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#DC2626', margin: '6px 0 0' }}>
                            {dealError}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#9CA3AF', fontWeight: 500 }}>{label}</span>
      <span style={{
        fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600,
        color: highlight ? '#92400E' : BRAND.midnight,
        background: highlight ? '#FEF9EC' : 'transparent',
        padding: highlight ? '2px 6px' : '0',
        borderRadius: highlight ? '4px' : '0',
      }}>
        {value}
      </span>
    </div>
  )
}