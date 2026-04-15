'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import NovationNav from '@/components/NovationNav'

const BRAND = {
  midnight: '#0D1B3E',
  electric: '#3B82F6',
  chalk:    '#F0EDE7',
  navy:     '#1A3266',
  border:   '#E2E6F0',
}

const STAGE_LABELS: Record<string, string> = {
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

const STAGE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  interested:           { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' },
  valuation_pending:    { bg: '#FEF9EC', color: '#92400E', border: '#FDE68A' },
  valuation_shared:     { bg: '#FEF9EC', color: '#92400E', border: '#FDE68A' },
  loi:                  { bg: '#DBEAFE', color: '#1A3266', border: '#BFDBFE' },
  due_diligence:        { bg: '#DBEAFE', color: '#1A3266', border: '#BFDBFE' },
  client_communication: { bg: '#EDE9FE', color: '#4C1D95', border: '#DDD6FE' },
  book_transfer:        { bg: '#EDE9FE', color: '#4C1D95', border: '#DDD6FE' },
  closed:               { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' },
  canceled:             { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: 44, height: 44, borderRadius: '50%',
      background: BRAND.midnight, color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 15, fontWeight: 700, fontFamily: 'DM Sans, sans-serif',
      flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

export default function DealsPage() {
  const router = useRouter()
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [canceling, setCanceling] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/deals')
      .then(r => r.json())
      .then(data => { setDeals(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function cancelDeal(dealId: string) {
    if (!window.confirm('Cancel this deal? This cannot be undone.')) return
    setCanceling(dealId)
    const res = await fetch(`/api/deals/${dealId}/cancel`, { method: 'POST' })
    if (res.ok) {
      setDeals(prev => prev.map(d => d.id === dealId ? { ...d, status: 'canceled' } : d))
    }
    setCanceling(null)
  }

  return (
    <div style={{ background: BRAND.chalk, minHeight: '100vh', paddingBottom: '4rem' }}>
      <NovationNav />
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <h1 style={{
          fontFamily: 'Playfair Display, Georgia, serif',
          fontSize: '26px', fontWeight: 600,
          color: BRAND.midnight, margin: '0 0 1.5rem',
        }}>
          My Deals
        </h1>

        {loading ? (
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF' }}>Loading…</p>
        ) : deals.length === 0 ? (
          <div style={{
            background: 'white', borderRadius: '12px',
            border: `1px solid ${BRAND.border}`, padding: '3rem', textAlign: 'center',
          }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF', margin: 0 }}>
              No active deals yet. Express interest from a message thread to get started.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {deals.map(deal => {
              const other = deal.is_seller ? deal.buyer : deal.seller
              const stageColor = STAGE_COLORS[deal.status] ?? STAGE_COLORS.interested
              const label = STAGE_LABELS[deal.status] ?? deal.status

              return (
                <div
                  key={deal.id}
                  style={{
                    background: 'white',
                    border: `1px solid ${BRAND.border}`,
                    borderRadius: '12px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                  }}
                >
                  <Avatar name={other.full_name} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '15px', fontWeight: 600,
                      color: BRAND.midnight, marginBottom: '3px',
                    }}>
                      {other.full_name}
                    </div>
                    <div style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '12px', color: '#9CA3AF',
                    }}>
                      Started: {new Date(deal.created_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>

                  <span style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '11px', fontWeight: 600,
                    padding: '4px 12px', borderRadius: '100px',
                    background: stageColor.bg,
                    color: stageColor.color,
                    border: `1px solid ${stageColor.border}`,
                    whiteSpace: 'nowrap',
                  }}>
                    {label}
                  </span>

                  <button
                    onClick={() => router.push(`/deals/${deal.id}`)}
                    style={{
                      padding: '8px 20px',
                      border: 'none',
                      borderRadius: '8px',
                      background: BRAND.electric,
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: 600,
                      fontFamily: 'DM Sans, sans-serif',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    Open
                  </button>
                  {deal.status !== 'canceled' && deal.status !== 'closed' && (
                    <button
                      onClick={() => cancelDeal(deal.id)}
                      disabled={canceling === deal.id}
                      style={{
                        padding: '8px 16px',
                        border: '1px solid #FECACA',
                        borderRadius: '8px',
                        background: 'white',
                        color: '#DC2626',
                        fontSize: '13px',
                        fontWeight: 600,
                        fontFamily: 'DM Sans, sans-serif',
                        cursor: canceling === deal.id ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        opacity: canceling === deal.id ? 0.6 : 1,
                      }}
                    >
                      {canceling === deal.id ? '…' : 'Cancel'}
                    </button>
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