'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import NovationNav from '@/components/NovationNav'

const BRAND = {
  midnight: '#0D1B3E',
  electric: '#3B82F6',
  chalk:    '#F0EDE7',
  navy:     '#1A3266',
  border:   '#E2E6F0',
}

type FeedItem = {
  id: string
  type: 'message' | 'deal'
  description: string
  created_at: string
  href: string
  action: string
}

const STAGE_LABELS: Record<string, string> = {
  interested:           'Interest',
  valuation_pending:    'Valuation',
  valuation_shared:     'Valuation',
  loi:                  'LOI',
  due_diligence:        'Due Diligence',
  client_communication: 'Client Comms',
  book_transfer:        'Book Transfer',
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function MessageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="3" width="13" height="10" rx="1.5" stroke="#185FA5" strokeWidth="1.25" />
      <path d="M1.5 5.5l6.5 4.5 6.5-4.5" stroke="#185FA5" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  )
}

function DealIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="#E24B4A" strokeWidth="1.25" />
      <path d="M5 2.5v2M11 2.5v2M1.5 7h13" stroke="#E24B4A" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [feed, setFeed]                           = useState<FeedItem[]>([])
  const [firstName, setFirstName]                 = useState('')
  const [loading, setLoading]                     = useState(true)
  const [activeDealsCount, setActiveDealsCount]   = useState(0)
  const [unreadMsgCount, setUnreadMsgCount]       = useState(0)
  const [actionsNeededCount, setActionsNeededCount] = useState(0)

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Advisor name
      const { data: advisor } = await supabase
        .from('advisors')
        .select('full_name')
        .eq('id', user.id)
        .single()
      if (advisor?.full_name) setFirstName(advisor.full_name.split(' ')[0])

      // ── Unread messages ──────────────────────────────────────────
      const { data: unread } = await supabase
        .from('messages')
        .select('id, body, created_at, from_id, parent_id')
        .eq('to_id', user.id)
        .is('read_at', null)
        .order('created_at', { ascending: false })

      // Resolve sender names
      const senderIds = [...new Set((unread ?? []).map(m => m.from_id))]
      let senderMap: Record<string, string> = {}
      if (senderIds.length > 0) {
        const { data: senders } = await supabase
          .from('advisors')
          .select('id, full_name')
          .in('id', senderIds)
        senderMap = Object.fromEntries((senders ?? []).map(s => [s.id, s.full_name]))
      }

      // Deduplicate by thread — keep most recent unread per conversation
      type UnreadMsg = { id: string; body: string; created_at: string; from_id: string; parent_id: string | null }
      const threadMap = new Map<string, UnreadMsg>()
      for (const msg of unread ?? []) {
        const tid = msg.parent_id ?? msg.id
        const existing = threadMap.get(tid)
        if (!existing || new Date(msg.created_at) > new Date(existing.created_at)) {
          threadMap.set(tid, msg)
        }
      }

      const messageItems: FeedItem[] = Array.from(threadMap.values()).map(msg => ({
        id:          `msg-${msg.id}`,
        type:        'message',
        description: `New message from ${senderMap[msg.from_id] ?? 'Someone'}`,
        created_at:  msg.created_at,
        href:        `/inbox/${msg.parent_id ?? msg.id}`,
        action:      'View →',
      }))

      // ── Deals waiting on user ────────────────────────────────────
      const { data: deals } = await supabase
        .from('deals')
        .select(`
          id, status, initiator_id, seller_id, buyer_id,
          seller_confirmed_next, buyer_confirmed_next,
          created_at, updated_at,
          seller:seller_id(id, full_name),
          buyer:buyer_id(id, full_name)
        `)
        .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`)

      const dealItems: FeedItem[] = []
      for (const deal of deals ?? []) {
        if (deal.status === 'closed' || deal.status === 'canceled') continue

        const isSeller  = deal.seller_id === user.id
        const otherRaw  = isSeller ? deal.buyer : deal.seller
        const other     = Array.isArray(otherRaw) ? otherRaw[0] : otherRaw
        const otherName = other?.full_name ?? 'your counterpart'
        const stage     = STAGE_LABELS[deal.status] ?? deal.status

        let needsAction = false

        if (deal.status === 'interested' && deal.initiator_id !== user.id) {
          needsAction = true
        } else if (deal.status === 'valuation_shared' && !isSeller) {
          needsAction = true
        } else if (['loi', 'due_diligence', 'client_communication', 'book_transfer'].includes(deal.status)) {
          const myConfirmed = isSeller ? deal.seller_confirmed_next : deal.buyer_confirmed_next
          if (!myConfirmed) needsAction = true
        }

        if (needsAction) {
          dealItems.push({
            id:          `deal-${deal.id}`,
            type:        'deal',
            description: `Your confirmation needed — ${stage} with ${otherName}`,
            created_at:  deal.updated_at ?? deal.created_at,
            href:        `/deals/${deal.id}`,
            action:      'View →',
          })
        }
      }

      // ── Stat counts ───────────────────────────────────────────────
      setActiveDealsCount((deals ?? []).filter(d => d.status !== 'closed' && d.status !== 'canceled').length)
      setUnreadMsgCount((unread ?? []).length)
      setActionsNeededCount(dealItems.length)

      // ── Merge + sort ─────────────────────────────────────────────
      const all = [...messageItems, ...dealItems].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      setFeed(all)
      setLoading(false)
    }

    load()
  }, [])

  return (
    <div style={{ background: BRAND.chalk, minHeight: '100vh', paddingBottom: '4rem' }}>
      <NovationNav />
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>

        {/* Greeting */}
        <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '28px', fontWeight: 600, color: BRAND.midnight, margin: '0 0 0.2rem' }}>
          {firstName ? `Welcome back, ${firstName}.` : 'Welcome back.'}
        </h1>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#888780', margin: '0 0 2rem' }}>
          {today}
        </p>

        {/* Stat cards */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '2rem' }}>
          {[
            { label: 'Active deals',    value: activeDealsCount,    red: false },
            { label: 'Unread messages', value: unreadMsgCount,      red: false },
            { label: 'Actions needed',  value: actionsNeededCount,  red: actionsNeededCount > 0 },
          ].map(card => (
            <div
              key={card.label}
              style={{
                flex: 1,
                background: 'white',
                border: `1px solid ${BRAND.border}`,
                borderRadius: '10px',
                padding: '16px 18px',
              }}
            >
              <div style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: '#888780',
                marginBottom: '6px',
              }}>
                {card.label}
              </div>
              <div style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '26px',
                fontWeight: 600,
                lineHeight: 1,
                color: card.red ? '#E24B4A' : BRAND.midnight,
              }}>
                {loading ? '–' : card.value}
              </div>
            </div>
          ))}
        </div>

        {/* Activity feed */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#888780', marginBottom: '0.75rem' }}>
            Activity
          </div>

          {loading ? (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF' }}>Loading…</p>
          ) : feed.length === 0 ? (
            <div style={{ background: 'white', borderRadius: '10px', border: `1px solid ${BRAND.border}`, padding: '2.5rem', textAlign: 'center' }}>
              <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'center' }}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <circle cx="14" cy="14" r="13" stroke="#D1FAE5" strokeWidth="2" fill="#D1FAE5" />
                  <path d="M8 14.5l4 4 8-8" stroke="#065F46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF', margin: 0 }}>
                You're all caught up.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {feed.map(item => (
                <div
                  key={item.id}
                  style={{
                    background: 'white', borderRadius: '10px',
                    border: `1px solid ${BRAND.border}`,
                    padding: '1rem 1.25rem',
                    display: 'flex', alignItems: 'center', gap: '12px',
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: '8px', flexShrink: 0,
                    background: item.type === 'message' ? '#E6F1FB' : '#FCEBEB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {item.type === 'message' ? <MessageIcon /> : <DealIcon />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 500, color: BRAND.midnight }}>
                      {item.description}
                    </div>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#888780', marginTop: '2px' }}>
                      {timeAgo(item.created_at)}
                    </div>
                  </div>

                  <button
                    onClick={() => router.push(item.href)}
                    style={{
                      padding: '7px 14px', borderRadius: '8px',
                      fontSize: '12px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
                      cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                      ...(item.type === 'deal'
                        ? { border: 'none', background: BRAND.midnight, color: 'white' }
                        : { border: `1px solid ${BRAND.border}`, background: 'white', color: BRAND.midnight }
                      ),
                    }}
                  >
                    {item.action}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#888780', marginBottom: '0.75rem' }}>
            Quick actions
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              onClick={() => router.push('/marketplace')}
              style={{
                padding: '16px 18px',
                background: 'white', border: `1px solid ${BRAND.border}`, borderRadius: '10px',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500, color: BRAND.midnight, marginBottom: '3px' }}>
                Search marketplace →
              </div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#888780' }}>
                Browse available books
              </div>
            </button>
            <button
              onClick={() => router.push('/profile/edit')}
              style={{
                padding: '16px 18px',
                background: 'white', border: `1px solid ${BRAND.border}`, borderRadius: '10px',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500, color: BRAND.midnight, marginBottom: '3px' }}>
                Update your profile →
              </div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#888780' }}>
                Keep your listing current
              </div>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
