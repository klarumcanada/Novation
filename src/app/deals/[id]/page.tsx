'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import NovationNav from '@/components/NovationNav'

const BRAND = {
  midnight: '#0D1B3E',
  electric: '#3B82F6',
  chalk:    '#F0EDE7',
  navy:     '#1A3266',
  border:   '#E2E6F0',
  stepNum:  '#C5CDE8',
}

const STAGES = [
  { key: 'interested',           label: 'Interest' },
  { key: 'valuation_pending',    label: 'Valuation' },
  { key: 'valuation_shared',     label: 'Valuation' },   // same visual step
  { key: 'loi',                  label: 'LOI' },
  { key: 'due_diligence',        label: 'Due Diligence' },
  { key: 'client_communication', label: 'Client Comms' },
  { key: 'book_transfer',        label: 'Book Transfer' },
  { key: 'closed',               label: 'Deal Complete' },
] as const

// Deduplicated for display (valuation_pending + valuation_shared = one step)
const DISPLAY_STAGES = [
  { keys: ['interested'],                        label: 'Interest' },
  { keys: ['valuation_pending','valuation_shared'], label: 'Valuation' },
  { keys: ['loi'],                               label: 'LOI' },
  { keys: ['due_diligence'],                     label: 'Due Diligence' },
  { keys: ['client_communication'],              label: 'Client Comms' },
  { keys: ['book_transfer'],                     label: 'Book Transfer' },
  { keys: ['closed'],                            label: 'Deal Complete' },
]

function stageIndex(status: string) {
  return DISPLAY_STAGES.findIndex(s => s.keys.includes(status))
}

type Note = {
  id: string
  author_id: string
  author_name: string
  author_role: 'seller' | 'buyer' | 'mga'
  body: string
  created_at: string
}

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  seller: { bg: '#DBEAFE', color: '#1A3266' },
  buyer:  { bg: '#EDE9FE', color: '#4C1D95' },
  mga:    { bg: '#D1FAE5', color: '#065F46' },
}

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: BRAND.midnight, color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.34, fontWeight: 700,
      fontFamily: 'DM Sans, sans-serif', flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

// ─── Stage Progress Bar ───────────────────────────────────────────────────────
function StageBar({ status }: { status: string }) {
  const current = stageIndex(status)
  return (
    <div style={{ overflowX: 'auto', padding: '0 0 4px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 560, gap: 0 }}>
        {DISPLAY_STAGES.map((stage, i) => {
          const done   = i < current
          const active = i === current
          return (
            <div key={stage.label} style={{ display: 'flex', alignItems: 'flex-start', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, fontFamily: 'DM Sans, sans-serif',
                  background: done ? BRAND.electric : active ? BRAND.midnight : '#E5E7EB',
                  color: done || active ? 'white' : '#9CA3AF',
                  border: active ? `2px solid ${BRAND.electric}` : 'none',
                }}>
                  {done ? '✓' : i + 1}
                </div>
                <span style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: '10px', marginTop: 5,
                  color: active ? BRAND.midnight : 'var(--color-text-primary)',
                  fontWeight: active ? 700 : 400,
                  textAlign: 'center', whiteSpace: 'nowrap',
                }}>
                  {stage.label}
                </span>
              </div>
              {i < DISPLAY_STAGES.length - 1 && (
                <div style={{
                  height: 2, flex: 1, marginTop: 13, marginBottom: 0,
                  background: done ? BRAND.electric : '#E5E7EB',
                }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────
const TABS = ['Valuation', 'LOI', 'Due Diligence', 'Clients', 'Notes'] as const
type Tab = typeof TABS[number]

// Maps each tab to the DISPLAY_STAGES index whose passage marks it "done"
const TAB_STAGE_IDX: Partial<Record<Tab, number>> = {
  'Valuation':     1,
  'LOI':           2,
  'Due Diligence': 3,
  'Clients':       4,
}

function TabBar({ active, onChange, dealStatus }: { active: Tab; onChange: (t: Tab) => void; dealStatus: string }) {
  const currentIdx = stageIndex(dealStatus)

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-end',
      gap: 3,
      padding: '12px 20px 0',
      background: '#F3F4F6',
      borderBottom: `1px solid ${BRAND.border}`,
    }}>
      {TABS.map(tab => {
        const isActive = active === tab
        const stageIdx = TAB_STAGE_IDX[tab]
        const isDone = stageIdx !== undefined && currentIdx > stageIdx

        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 15px',
              border: `1px solid ${BRAND.border}`,
              borderBottom: isActive ? '1px solid white' : `1px solid ${BRAND.border}`,
              borderRadius: '7px 7px 0 0',
              background: isActive ? 'white' : '#E9EAEC',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              fontWeight: isActive ? 700 : 400,
              color: isActive ? BRAND.midnight : '#6B7280',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              marginBottom: -1,
              position: 'relative',
              zIndex: isActive ? 2 : 1,
            }}
          >
            {stageIdx !== undefined && (
              isDone ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="7" fill={BRAND.electric} />
                  <path d="M4 7.5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="#D1D5DB" strokeWidth="1.5" />
                </svg>
              )
            )}
            {tab}
          </button>
        )
      })}
    </div>
  )
}

// ─── Placeholder tab ─────────────────────────────────────────────────────────
function PlaceholderTab({ title, description }: { title: string; description: string }) {
  return (
    <div style={{
      padding: '40px 24px', textAlign: 'center',
      color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif',
    }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: BRAND.midnight, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13 }}>{description}</div>
    </div>
  )
}

// ─── Valuation tab ───────────────────────────────────────────────────────────
function ValuationTab({ deal }: { deal: any }) {
  const [valuation, setValuation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/valuations')
      .then(r => r.json())
      .then(d => { if (d && !d.error) setValuation(d) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ padding: 24, fontFamily: 'DM Sans, sans-serif', color: '#9CA3AF', fontSize: 13 }}>Loading…</div>

  const statusesThatHaveValuation = ['valuation_pending','valuation_shared','loi','due_diligence','client_communication','book_transfer','closed']
  if (!statusesThatHaveValuation.includes(deal.status)) {
    return <PlaceholderTab title="Not yet reached" description="Valuation becomes available once both parties confirm interest." />
  }

  if (!valuation) return (
    <div style={{ padding: 24 }}>
      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9CA3AF' }}>No valuation on file yet.</p>
    </div>
  )

  function formatMoney(n: number) {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
    return `$${n.toLocaleString()}`
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: BRAND.stepNum, marginBottom: 8 }}>
        Book Value Assessment
      </div>
      {valuation.low_value && valuation.high_value ? (
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 600, color: BRAND.midnight, marginBottom: 8 }}>
          {formatMoney(valuation.low_value)} – {formatMoney(valuation.high_value)}
        </div>
      ) : (
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 600, color: BRAND.midnight, marginBottom: 8 }}>See uploaded report</div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        {valuation.source === 'novation' && (
          <button onClick={() => router.push('/valuation/report')}
            style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', borderRadius: 8, border: 'none', background: BRAND.midnight, color: 'white', cursor: 'pointer' }}>
            View Full Report →
          </button>
        )}
        {valuation.source === 'uploaded' && valuation.document_url && (
          <a href={valuation.document_url} target="_blank" rel="noopener noreferrer"
            style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', borderRadius: 8, border: 'none', background: BRAND.midnight, color: 'white', cursor: 'pointer', textDecoration: 'none' }}>
            View uploaded report →
          </a>
        )}
      </div>
      {valuation.shared_with_buyer && (
        <div style={{ marginTop: 12, fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#065F46', background: '#D1FAE5', border: '1px solid #6EE7B7', borderRadius: 8, padding: '8px 12px', display: 'inline-block' }}>
          ✓ Shared with buyer
        </div>
      )}
    </div>
  )
}

// ─── LOI tab ─────────────────────────────────────────────────────────────────
function LOITab({ deal }: { deal: any }) {
  const router = useRouter()
  const loiStages = ['loi','due_diligence','client_communication','book_transfer','closed']
  if (!loiStages.includes(deal.status)) {
    return <PlaceholderTab title="Not yet reached" description="The LOI becomes available once valuation is shared and confirmed." />
  }

  const bothSigned = deal.loi_seller_signed && deal.loi_buyer_signed

  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: BRAND.stepNum, marginBottom: 16 }}>
        Letter of Intent
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Seller', signed: deal.loi_seller_signed, signedAt: deal.loi_seller_signed_at },
          { label: 'Buyer',  signed: deal.loi_buyer_signed,  signedAt: deal.loi_buyer_signed_at  },
        ].map(({ label, signed, signedAt }) => (
          <div key={label} style={{
            flex: 1, minWidth: 180,
            border: `1px solid ${signed ? '#86EFAC' : BRAND.border}`,
            borderRadius: 10, padding: '14px 16px',
            background: signed ? '#F0FDF4' : 'white',
          }}>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: BRAND.stepNum, marginBottom: 4 }}>{label}</div>
            {signed ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, color: '#16A34A' }}>Signed</span>
                </div>
                {signedAt && <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#64748B' }}>{new Date(signedAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}</div>}
              </>
            ) : (
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#94A3B8' }}>Awaiting signature</div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {deal.status === 'loi' && (
          <button
            onClick={() => router.push(`/deals/${deal.id}/loi`)}
            style={{ padding: '9px 20px', border: 'none', borderRadius: 8, background: BRAND.midnight, color: 'white', fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
            📄 Open LOI →
          </button>
        )}
        {bothSigned && (
          <button
            onClick={async () => {
              const res = await fetch(`/api/deals/${deal.id}/loi/pdf`)
              if (!res.ok) return
              const blob = await res.blob()
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url; a.download = `LOI-${deal.id.slice(0,8)}.pdf`; a.click()
              URL.revokeObjectURL(url)
            }}
            style={{ padding: '9px 20px', border: `1px solid ${BRAND.border}`, borderRadius: 8, background: 'white', color: BRAND.midnight, fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
            ↓ Download PDF
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Notes tab ───────────────────────────────────────────────────────────────
function NotesTab({ dealId, currentUserId }: { dealId: string; currentUserId: string | null }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadNotes = useCallback(async () => {
    const res = await fetch(`/api/deals/${dealId}/notes`)
    const data = await res.json()
    if (data.notes) setNotes(data.notes)
    setLoading(false)
  }, [dealId])

  useEffect(() => { loadNotes() }, [loadNotes])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [notes])

  async function submit() {
    if (!body.trim()) return
    setSubmitting(true)
    const res = await fetch(`/api/deals/${dealId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    })
    const data = await res.json()
    if (data.note) {
      setNotes(prev => [...prev, data.note])
      setBody('')
    }
    setSubmitting(false)
  }

  if (loading) return <div style={{ padding: 24, fontFamily: 'DM Sans, sans-serif', color: '#9CA3AF', fontSize: 13 }}>Loading…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Notes list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 400 }}>
        {notes.length === 0 ? (
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9CA3AF', textAlign: 'center', margin: '24px 0' }}>
            No notes yet. Add the first one below.
          </p>
        ) : notes.map(note => {
          const isMe = note.author_id === currentUserId
          const roleColor = ROLE_COLORS[note.author_role] ?? ROLE_COLORS.seller
          return (
            <div key={note.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, color: BRAND.midnight }}>
                  {note.author_name}
                </span>
                <span style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600,
                  padding: '2px 7px', borderRadius: 100,
                  background: roleColor.bg, color: roleColor.color,
                  textTransform: 'capitalize',
                }}>
                  {note.author_role === 'mga' ? 'MGA' : note.author_role}
                </span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#9CA3AF' }}>
                  {new Date(note.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                  {' '}
                  {new Date(note.created_at).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div style={{
                maxWidth: '80%',
                background: isMe ? BRAND.midnight : 'white',
                color: isMe ? 'white' : BRAND.midnight,
                border: `1px solid ${isMe ? BRAND.midnight : BRAND.border}`,
                borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                padding: '10px 14px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 13,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}>
                {note.body}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        borderTop: `1px solid ${BRAND.border}`,
        padding: '16px 24px',
        display: 'flex', gap: 10, alignItems: 'flex-end',
      }}>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit() }}
          placeholder="Add a note… (⌘↵ to send)"
          rows={2}
          style={{
            flex: 1, padding: '10px 14px',
            border: `1px solid ${BRAND.border}`, borderRadius: 10,
            fontFamily: 'DM Sans, sans-serif', fontSize: 13,
            color: BRAND.midnight, resize: 'none', outline: 'none',
            lineHeight: 1.5,
          }}
        />
        <button
          onClick={submit}
          disabled={submitting || !body.trim()}
          style={{
            padding: '10px 18px',
            border: 'none', borderRadius: 10,
            background: body.trim() ? BRAND.midnight : '#E5E7EB',
            color: body.trim() ? 'white' : '#9CA3AF',
            fontSize: 13, fontWeight: 600,
            fontFamily: 'DM Sans, sans-serif',
            cursor: body.trim() ? 'pointer' : 'not-allowed',
            flexShrink: 0,
          }}
        >
          {submitting ? '…' : 'Send'}
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [deal, setDeal] = useState<any>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('Valuation')
  const [canceling, setCanceling] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/deals/${id}`).then(r => r.json()),
      fetch('/api/me').then(r => r.json()),
    ]).then(([dealData, meData]) => {
      if (dealData && !dealData.error) setDeal(dealData)
      if (meData?.user?.id) setCurrentUserId(meData.user.id)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: BRAND.chalk, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif', color: BRAND.midnight }}>
      Loading…
    </div>
  )

  if (!deal) return (
    <div style={{ minHeight: '100vh', background: BRAND.chalk, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif', color: BRAND.midnight }}>
      Deal not found.
    </div>
  )

  const other = deal.is_seller ? deal.buyer : deal.seller
  const isClosed = deal.status === 'closed'

  const STAGE_LABEL_MAP: Record<string, string> = {
    interested:           'Interested',
    valuation_pending:    'Valuation Pending',
    valuation_shared:     'Valuation Shared',
    loi:                  'Letter of Intent',
    due_diligence:        'Due Diligence',
    client_communication: 'Client Communication',
    book_transfer:        'Book Transfer',
    closed:               'Closed',
    canceled:             'Canceled',
  }

  async function cancelDeal() {
    if (!window.confirm('Cancel this deal? This cannot be undone.')) return
    setCanceling(true)
    const res = await fetch(`/api/deals/${id}/cancel`, { method: 'POST' })
    const json = await res.json()
    if (res.ok) {
      setDeal((prev: any) => ({ ...prev, status: 'canceled' }))
    } else {
      console.error('Cancel failed:', json)
      alert(`Could not cancel deal: ${json.error ?? 'Unknown error'}`)
    }
    setCanceling(false)
  }

  return (
    <div style={{ background: BRAND.chalk, minHeight: '100vh', paddingBottom: '4rem' }}>
      <NovationNav />
      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Back */}
        <button
          onClick={() => router.push('/deals')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif', marginBottom: '1.25rem', padding: 0 }}
        >
          ← My Deals
        </button>

        {/* Deal card */}
        <div style={{ background: 'white', borderRadius: 14, border: `1px solid ${BRAND.border}`, overflow: 'hidden', marginBottom: '1.5rem' }}>

          {/* Header */}
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BRAND.border}`, display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar name={other.full_name} size={48} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 20, fontWeight: 600, color: BRAND.midnight, marginBottom: 2 }}>
                {other.full_name}
              </div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#9CA3AF' }}>
                {deal.is_seller ? 'Buyer' : 'Seller'} · Started {new Date(deal.created_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
            <span style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600,
              padding: '5px 14px', borderRadius: 100,
              background: deal.status === 'canceled' ? '#FEF2F2' : isClosed ? '#D1FAE5' : '#DBEAFE',
              color: deal.status === 'canceled' ? '#991B1B' : isClosed ? '#065F46' : BRAND.navy,
              border: `1px solid ${deal.status === 'canceled' ? '#FECACA' : isClosed ? '#6EE7B7' : '#BFDBFE'}`,
            }}>
              {STAGE_LABEL_MAP[deal.status] ?? deal.status}
            </span>
          </div>

          {/* Stage tracker */}
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BRAND.border}` }}>
            <StageBar status={deal.status} />
          </div>

          {/* Tab bar */}
          <TabBar active={activeTab} onChange={setActiveTab} dealStatus={deal.status} />

          {/* Tab content */}
          <div style={{ minHeight: 200 }}>
            {activeTab === 'Valuation' && <ValuationTab deal={deal} />}
            {activeTab === 'LOI' && <LOITab deal={deal} />}
            {activeTab === 'Due Diligence' && (
              <PlaceholderTab
                title="Due Diligence"
                description="Document requests, checklists, and data room access will appear here."
              />
            )}
            {activeTab === 'Clients' && (
              <PlaceholderTab
                title="Client List"
                description="Client roster and transition communication tracking will appear here."
              />
            )}
            {activeTab === 'Notes' && (
              <NotesTab dealId={id} currentUserId={currentUserId} />
            )}
          </div>

        </div>

        {/* Cancel deal — below card, right-aligned */}
        {deal.status !== 'canceled' && deal.status !== 'closed' && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button
              onClick={cancelDeal}
              disabled={canceling}
              style={{
                padding: '9px 20px',
                border: `1px solid ${BRAND.border}`,
                borderRadius: 8,
                background: 'white',
                color: '#6B7280',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'DM Sans, sans-serif',
                cursor: canceling ? 'not-allowed' : 'pointer',
                opacity: canceling ? 0.6 : 1,
              }}
            >
              {canceling ? 'Canceling…' : 'Cancel Deal'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}