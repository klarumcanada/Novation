'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

// ── Stage config ─────────────────────────────────────────────────────────────

type StageKey =
  | 'interested'
  | 'valuation_pending'
  | 'valuation_shared'
  | 'loi'
  | 'due_diligence'
  | 'client_communication'
  | 'book_transfer'
  | 'closed'
  | 'canceled'

const STAGE_LABEL: Record<StageKey, string> = {
  interested:           'Interest',
  valuation_pending:    'Valuation',
  valuation_shared:     'Valuation',
  loi:                  'Letter of Intent',
  due_diligence:        'Due Diligence',
  client_communication: 'Client Comms',
  book_transfer:        'Book Transfer',
  closed:               'Complete',
  canceled:             'Cancelled',
}

const STAGE_BADGE: Record<StageKey, { bg: string; color: string }> = {
  interested:           { bg: '#E6F1FB', color: '#0C447C' },
  valuation_pending:    { bg: '#E6F1FB', color: '#0C447C' },
  valuation_shared:     { bg: '#E6F1FB', color: '#0C447C' },
  loi:                  { bg: '#E6F1FB', color: '#0C447C' },
  due_diligence:        { bg: '#E6F1FB', color: '#0C447C' },
  client_communication: { bg: '#E6F1FB', color: '#0C447C' },
  book_transfer:        { bg: '#E6F1FB', color: '#0C447C' },
  closed:               { bg: '#EAF3DE', color: '#27500A' },
  canceled:             { bg: '#F1EFE8', color: '#5F5E5A' },
}

// Options shown in the stage dropdown
const STAGE_FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: 'All stages',       value: '' },
  { label: 'Interest',         value: 'interested' },
  { label: 'Valuation',        value: 'valuation' },       // matches both valuation_* statuses
  { label: 'Letter of Intent', value: 'loi' },
  { label: 'Due Diligence',    value: 'due_diligence' },
  { label: 'Client Comms',     value: 'client_communication' },
  { label: 'Book Transfer',    value: 'book_transfer' },
  { label: 'Complete',         value: 'closed' },
  { label: 'Cancelled',        value: 'canceled' },
]

// ── Types ─────────────────────────────────────────────────────────────────────

type Deal = {
  id: string
  seller_id: string
  buyer_id: string
  status: StageKey
  created_at: string
  updated_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${mm}/${dd}/${yyyy}`
}

function stageMatchesFilter(status: StageKey, filter: string) {
  if (!filter) return true
  if (filter === 'valuation') return status === 'valuation_pending' || status === 'valuation_shared'
  return status === filter
}

// ── Styles ────────────────────────────────────────────────────────────────────

const PAGE_BG = '#F0EDE7'
const MIDNIGHT = '#0D1B3E'
const BORDER   = '#E2E6F0'
const ELECTRIC = '#3B82F6'
const FONT     = 'DM Sans, sans-serif'

const labelStyle: React.CSSProperties = {
  fontFamily: FONT, fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '.08em',
  color: '#9CA3AF', marginBottom: 8, display: 'block',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', fontSize: 13,
  fontFamily: FONT, borderRadius: 8,
  border: `1.5px solid ${BORDER}`, background: 'white',
  color: MIDNIGHT, outline: 'none', boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = { ...inputStyle }

// ── Component ─────────────────────────────────────────────────────────────────

export default function MgaDealsPage() {
  const params  = useParams()
  const router  = useRouter()
  const slug    = params.slug as string

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [deals,      setDeals]      = useState<Deal[]>([])
  const [advisorMap, setAdvisorMap] = useState<Record<string, string>>({})
  const [loading,    setLoading]    = useState(true)

  // Filter state
  const [stageFilter,   setStageFilter]   = useState('')
  const [advisorSearch, setAdvisorSearch] = useState('')
  const [dateFrom,      setDateFrom]      = useState('')
  const [dateTo,        setDateTo]        = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)

    const { data: mga } = await supabase
      .from('mgas')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!mga) { setLoading(false); return }

    const { data: advisors } = await supabase
      .from('advisors')
      .select('id, full_name')
      .eq('mga_id', mga.id)

    const ids = (advisors ?? []).map(a => a.id)
    const map = Object.fromEntries((advisors ?? []).map(a => [a.id, a.full_name as string]))
    setAdvisorMap(map)

    if (ids.length === 0) { setDeals([]); setLoading(false); return }

    const { data } = await supabase
      .from('deals')
      .select('id, seller_id, buyer_id, status, created_at, updated_at')
      .or(`seller_id.in.(${ids.join(',')}),buyer_id.in.(${ids.join(',')})`)
      .order('updated_at', { ascending: false })

    setDeals((data ?? []) as Deal[])
    setLoading(false)
  }

  function clearFilters() {
    setStageFilter('')
    setAdvisorSearch('')
    setDateFrom('')
    setDateTo('')
  }

  const filtered = useMemo(() => {
    let result = deals

    if (stageFilter) {
      result = result.filter(d => stageMatchesFilter(d.status, stageFilter))
    }

    if (advisorSearch.trim()) {
      const q = advisorSearch.toLowerCase()
      result = result.filter(d => {
        const seller = (advisorMap[d.seller_id] ?? '').toLowerCase()
        const buyer  = (advisorMap[d.buyer_id]  ?? '').toLowerCase()
        return seller.includes(q) || buyer.includes(q)
      })
    }

    if (dateFrom) {
      const from = new Date(dateFrom).getTime()
      result = result.filter(d => new Date(d.created_at).getTime() >= from)
    }

    if (dateTo) {
      // inclusive: end of the selected day
      const to = new Date(dateTo).getTime() + 86_400_000 - 1
      result = result.filter(d => new Date(d.created_at).getTime() <= to)
    }

    return result
  }, [deals, stageFilter, advisorSearch, dateFrom, dateTo, advisorMap])

  const hasActiveFilters = !!(stageFilter || advisorSearch.trim() || dateFrom || dateTo)

  return (
    <main style={{ background: PAGE_BG, minHeight: '100vh', paddingBottom: '4rem' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 28px', display: 'flex', gap: 32, alignItems: 'flex-start' }}>

        {/* ── Filter panel ── */}
        <div style={{ width: 220, flexShrink: 0, position: 'sticky', top: 80 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: MIDNIGHT }}>
              Filters
            </span>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                style={{ background: 'none', border: 'none', fontSize: 12, color: ELECTRIC, cursor: 'pointer', fontFamily: FONT, padding: 0 }}
              >
                Clear all
              </button>
            )}
          </div>

          {/* Stage */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Stage</label>
            <select
              value={stageFilter}
              onChange={e => setStageFilter(e.target.value)}
              style={selectStyle}
            >
              {STAGE_FILTER_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Advisor name */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Advisor name</label>
            <input
              type="text"
              placeholder="Search seller or buyer…"
              value={advisorSearch}
              onChange={e => setAdvisorSearch(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Date started */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Date started</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              style={{ ...inputStyle, marginBottom: 6 }}
            />
            <div style={{ fontFamily: FONT, fontSize: 11, color: '#9CA3AF', marginBottom: 6, paddingLeft: 2 }}>to</div>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* ── Main content ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Page header */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 28, fontWeight: 600, color: MIDNIGHT, margin: '0 0 4px' }}>
              Deals
            </h1>
            <p style={{ fontFamily: FONT, fontSize: 14, color: '#9CA3AF', margin: 0 }}>
              {loading ? 'Loading…' : `${filtered.length} deal${filtered.length !== 1 ? 's' : ''}${hasActiveFilters ? ' matching filters' : ' across your advisor network'}`}
            </p>
          </div>

          {/* Table card */}
          <div style={{ background: 'white', border: `0.5px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '3rem', fontFamily: FONT, fontSize: 14, color: '#9CA3AF', textAlign: 'center' }}>
                Loading deals…
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 600, color: MIDNIGHT, marginBottom: 6 }}>
                  No deals found
                </div>
                <div style={{ fontFamily: FONT, fontSize: 13, color: '#9CA3AF' }}>
                  {hasActiveFilters ? 'Try adjusting your filters.' : 'Deals will appear here once advisors begin the succession process.'}
                </div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {['Seller', 'Buyer', 'Stage', 'Started', 'Last activity'].map(col => (
                      <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((deal, i) => {
                    const badge = STAGE_BADGE[deal.status] ?? STAGE_BADGE.interested
                    const label = STAGE_LABEL[deal.status] ?? deal.status
                    return (
                      <tr
                        key={deal.id}
                        onClick={() => router.push(`/mga/${slug}/deals/${deal.id}`)}
                        style={{
                          borderBottom: i < filtered.length - 1 ? `1px solid ${BORDER}` : 'none',
                          cursor: 'pointer',
                          transition: 'background .1s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#FAFAF9' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                      >
                        <td style={{ padding: '14px 16px', fontSize: 13, color: MIDNIGHT, fontWeight: 500 }}>
                          {advisorMap[deal.seller_id] ?? '—'}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 13, color: MIDNIGHT }}>
                          {advisorMap[deal.buyer_id] ?? '—'}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 9px',
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 600,
                            letterSpacing: '.03em',
                            background: badge.bg,
                            color: badge.color,
                          }}>
                            {label}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 13, color: '#6B7280' }}>
                          {fmtDate(deal.created_at)}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 13, color: '#6B7280' }}>
                          {fmtDate(deal.updated_at)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </main>
  )
}
