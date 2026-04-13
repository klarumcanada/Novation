'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import NovationNav from '@/components/NovationNav'

const BRAND = {
  midnight: '#0D1B3E',
  electric: '#3B82F6',
  chalk: '#F0EDE7',
  ice: '#DBEAFE',
  navy: '#1A3266',
  voltage: '#E8C547',
}

const STAGES = ['interested', 'loi', 'due_diligence', 'closed'] as const
type Stage = typeof STAGES[number]

const STAGE_LABELS: Record<Stage, string> = {
  interested: 'Interested',
  loi: 'Letter of Intent',
  due_diligence: 'Due Diligence',
  closed: 'Closed',
}

type Deal = {
  id: string
  status: Stage
  seller: { id: string; full_name: string }
  buyer: { id: string; full_name: string }
  is_seller: boolean
  my_confirmed: boolean
  their_confirmed: boolean
  thread_id: string | null
  created_at: string
  updated_at: string
}

function StageTrack({ status }: { status: Stage }) {
  const current = STAGES.indexOf(status)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, margin: '1rem 0' }}>
      {STAGES.map((stage, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={stage} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700, fontFamily: 'DM Sans, sans-serif',
                background: done ? BRAND.electric : active ? BRAND.midnight : '#E5E7EB',
                color: done || active ? 'white' : '#9CA3AF',
                border: active ? `2px solid ${BRAND.electric}` : 'none',
                transition: 'all .2s',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: '10px', marginTop: '4px',
                color: active ? BRAND.midnight : done ? BRAND.electric : '#9CA3AF',
                fontWeight: active ? 600 : 400, textAlign: 'center', whiteSpace: 'nowrap',
              }}>
                {STAGE_LABELS[stage]}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div style={{
                height: '2px', flex: 1, marginBottom: '18px',
                background: done ? BRAND.electric : '#E5E7EB',
                transition: 'all .2s',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function DealsPage() {
  const router = useRouter()
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/deals')
      .then(r => r.json())
      .then(data => { setDeals(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleConfirm(dealId: string) {
    setConfirming(dealId)
    const res = await fetch(`/api/deals/${dealId}/confirm`, { method: 'POST' })
    const data = await res.json()
    console.log('confirm response:', res.status, data)
    setConfirming(null)

    if (res.ok) {
      setDeals(prev => prev.map(d => d.id === dealId ? {
        ...d,
        status: data.deal.status,
        my_confirmed: data.advanced ? false : true,
        their_confirmed: data.advanced ? false : d.their_confirmed,
      } : d))
    }
  }

  const nextLabel = (status: Stage) => {
    const next = STAGES[STAGES.indexOf(status) + 1]
    return next ? `Move to ${STAGE_LABELS[next]}` : null
  }

  return (
    <div style={{ background: BRAND.chalk, minHeight: '100vh', paddingBottom: '4rem' }}>
      <NovationNav />

      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '26px', fontWeight: 600, color: BRAND.midnight, margin: '0 0 2rem 0' }}>
          My Deals
        </h1>

        {loading ? (
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF' }}>Loading…</p>
        ) : deals.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E6F0', padding: '3rem', textAlign: 'center' }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF', margin: 0 }}>
              No active deals yet. Express interest in a deal from a message thread to get started.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {deals.map(deal => {
              const other = deal.is_seller ? deal.buyer : deal.seller
              const isClosed = deal.status === 'closed'
              const canAdvance = !isClosed && nextLabel(deal.status)

              return (
                <div key={deal.id} style={{
                  background: 'white', borderRadius: '12px', border: '1px solid #E2E6F0',
                  overflow: 'hidden',
                }}>
                  {/* Header */}
                  <div style={{ borderLeft: `4px solid ${BRAND.electric}`, padding: '1.25rem 1.5rem', borderBottom: '1px solid #F3F4F6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '17px', fontWeight: 600, color: BRAND.midnight, marginBottom: '2px' }}>
                          {deal.is_seller ? `Buyer: ${other.full_name}` : `Seller: ${other.full_name}`}
                        </div>
                        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#9CA3AF' }}>
                          Started {new Date(deal.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                      <span style={{
                        padding: '4px 10px', fontSize: '11px', fontFamily: 'DM Sans, sans-serif',
                        fontWeight: 600, borderRadius: '100px',
                        background: isClosed ? '#D1FAE5' : BRAND.ice,
                        color: isClosed ? '#065F46' : BRAND.navy,
                      }}>
                        {STAGE_LABELS[deal.status]}
                      </span>
                    </div>
                  </div>

                  {/* Stage track */}
                  <div style={{ padding: '0 1.5rem' }}>
                    <StageTrack status={deal.status} />
                  </div>

                  {/* Actions */}
                  {!isClosed && (
                    <div style={{ padding: '0 1.5rem 1.5rem' }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        <ConfirmPill label="You" confirmed={deal.my_confirmed} />
                        <ConfirmPill label={other.full_name.split(' ')[0]} confirmed={deal.their_confirmed} />
                      </div>

                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {canAdvance && !deal.my_confirmed && (
                          <button
                            onClick={() => handleConfirm(deal.id)}
                            disabled={confirming === deal.id}
                            style={{
                              padding: '9px 18px', fontSize: '13px', fontWeight: 600,
                              fontFamily: 'DM Sans, sans-serif', borderRadius: '8px',
                              border: 'none', background: BRAND.midnight, color: 'white',
                              cursor: confirming === deal.id ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {confirming === deal.id ? 'Confirming…' : `Confirm: ${nextLabel(deal.status)}`}
                          </button>
                        )}
                        {deal.my_confirmed && !deal.their_confirmed && (
                          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: BRAND.electric, alignSelf: 'center', margin: 0 }}>
                            ✓ Waiting for {other.full_name.split(' ')[0]} to confirm
                          </p>
                        )}
                        {deal.thread_id && (
                          <button
                            onClick={() => router.push(`/inbox/${deal.thread_id}`)}
                            style={{
                              padding: '9px 18px', fontSize: '13px', fontWeight: 500,
                              fontFamily: 'DM Sans, sans-serif', borderRadius: '8px',
                              border: '1.5px solid #E2E6F0', background: 'white', color: '#6B7280',
                              cursor: 'pointer',
                            }}
                          >
                            View thread →
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {isClosed && (
                    <div style={{ padding: '0 1.5rem 1.5rem' }}>
                      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B7280', margin: 0 }}>
                        This deal has been completed. 🎉
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function ConfirmPill({ label, confirmed }: { label: string; confirmed: boolean }) {
  return (
    <span style={{
      fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 500,
      padding: '3px 10px', borderRadius: '100px',
      background: confirmed ? '#D1FAE5' : '#F3F4F6',
      color: confirmed ? '#065F46' : '#9CA3AF',
      border: `1px solid ${confirmed ? '#6EE7B7' : '#E5E7EB'}`,
    }}>
      {confirmed ? `✓ ${label}` : `${label} — pending`}
    </span>
  )
}