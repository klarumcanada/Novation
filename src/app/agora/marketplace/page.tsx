'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import AgoraNav from '@/components/AgoraNav'

const BRAND = {
  midnight: '#0D1B3E',
  navy: '#1A3266',
  electric: '#3B82F6',
  ice: '#DBEAFE',
  chalk: '#F8F7F4',
  voltage: '#E8C547',
}

const PROVINCES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT']

const PRODUCTS = [
  'Life insurance', 'Group benefits', 'Investments', 'Disability insurance',
  'Critical illness', 'Long-term care', 'Segregated funds', 'Annuities',
]

const CARRIERS = [
  'Canada Life', 'Sun Life', 'Manulife', 'Desjardins', 'Empire Life',
  'Equitable Life', 'Industrial Alliance', 'BMO Insurance', 'RBC Insurance', 'SSQ Insurance',
]

const EXIT_TIMELINES = ['0–6 months', '6–12 months', '1–2 years', '2+ years']
const ACQ_TIMELINES  = ['0–6 months', '6–12 months', '1–2 years', '2+ years']

const BOOK_VALUE_RANGES = [
  { label: 'Under $500K',   min: 0,         max: 500_000   },
  { label: '$500K – $1M',   min: 500_000,   max: 1_000_000 },
  { label: '$1M – $2M',     min: 1_000_000, max: 2_000_000 },
  { label: '$2M – $5M',     min: 2_000_000, max: 5_000_000 },
  { label: 'Over $5M',      min: 5_000_000, max: undefined  },
]

const BUDGET_RANGES = [
  { label: 'Under $500K', min: 0,   max: 0.5      },
  { label: '$500K – $1M', min: 0.5, max: 1        },
  { label: '$1M – $2M',   min: 1,   max: 2        },
  { label: '$2M – $5M',   min: 2,   max: 5        },
  { label: 'Over $5M',    min: 5,   max: undefined },
]

type Details = {
  aum_cad?: number | null
  aggregate_aum_cad?: number | null
  client_count?: number | null
  exit_timeline?: string | null
  sale_portion_type?: string | null
  acquisition_budget_cad?: number | null
  acquisition_timeline?: string | null
  target_provinces?: string[] | null
  products?: string[] | null
  carrier_affiliations?: string[] | null
  years_in_business?: number | null
}

type AgoraProfile = {
  id: string
  account_type: 'individual' | 'corporation'
  role: 'buyer' | 'seller'
  name: string
  city: string | null
  province: string
  avatar_url: string | null
  bio: string | null
  details: Details
}

function formatMoney(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toLocaleString()}`
}

function getInitials(name: string) {
  const parts = name?.trim().split(' ') ?? []
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return '?'
}

export default function AgoraMarketplacePage() {
  const [profiles, setProfiles] = useState<AgoraProfile[]>([])
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [myRole, setMyRole] = useState<'buyer' | 'seller' | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'browse' | 'saved'>('browse')

  const [province, setProvince] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [selectedCarriers, setSelectedCarriers] = useState<string[]>([])
  const [bookValueRange, setBookValueRange] = useState<typeof BOOK_VALUE_RANGES[number] | null>(null)
  const [budgetRange, setBudgetRange] = useState<typeof BUDGET_RANGES[number] | null>(null)
  const [exitTimeline, setExitTimeline] = useState('')
  const [acqTimeline, setAcqTimeline] = useState('')
  const [entityType, setEntityType] = useState('')

  const fetchProfiles = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (province) params.set('province', province)
    if (selectedProducts.length) params.set('products', selectedProducts.join(','))
    if (selectedCarriers.length) params.set('carriers', selectedCarriers.join(','))
    if (bookValueRange?.min !== undefined) params.set('minBookValue', String(bookValueRange.min))
    if (bookValueRange?.max !== undefined) params.set('maxBookValue', String(bookValueRange.max))
    if (budgetRange?.min !== undefined) params.set('minBudget', String(budgetRange.min))
    if (budgetRange?.max !== undefined) params.set('maxBudget', String(budgetRange.max))
    if (exitTimeline) params.set('timeline', exitTimeline)
    if (acqTimeline) params.set('timeline', acqTimeline)
    if (entityType) params.set('entityType', entityType)

    const [res, savesRes] = await Promise.all([
      fetch(`/api/agora/marketplace?${params.toString()}`),
      fetch('/api/agora/saves'),
    ])

    const [data, savesData] = await Promise.all([res.json(), savesRes.json()])
    setProfiles(data.profiles ?? [])
    if (data.myRole) setMyRole(data.myRole)
    setSavedIds(savesData.saved ?? [])
    setLoading(false)
  }, [province, selectedProducts, selectedCarriers, bookValueRange, budgetRange, exitTimeline, acqTimeline, entityType])

  useEffect(() => { fetchProfiles() }, [fetchProfiles])

  function toggleItem(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value])
  }

  function clearFilters() {
    setProvince('')
    setSelectedProducts([])
    setSelectedCarriers([])
    setBookValueRange(null)
    setBudgetRange(null)
    setExitTimeline('')
    setAcqTimeline('')
    setEntityType('')
  }

  const isBuyer = myRole === 'buyer'
  const savedProfiles = profiles.filter(p => savedIds.includes(p.id))
  const displayedProfiles = tab === 'saved' ? savedProfiles : profiles

  return (
    <div style={{ background: BRAND.chalk, minHeight: '100vh' }}>
      <AgoraNav />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 1.5rem', display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>

        {/* Sidebar */}
        <aside style={{ width: '240px', flexShrink: 0, background: 'white', borderRadius: '12px', border: '1px solid #E2E6F0', padding: '1.5rem', position: 'sticky', top: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <span style={filterHeaderStyle}>Filters</span>
            <button onClick={clearFilters} style={clearBtnStyle}>Clear all</button>
          </div>

          <FilterSection label="Province">
            <select value={province} onChange={e => setProvince(e.target.value)} style={selectStyle}>
              <option value="">All provinces</option>
              {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </FilterSection>

          {isBuyer && (
            <FilterSection label="Book value">
              {BOOK_VALUE_RANGES.map(r => (
                <FilterChip key={r.label} label={r.label} active={bookValueRange?.label === r.label}
                  onClick={() => setBookValueRange(bookValueRange?.label === r.label ? null : r)} />
              ))}
            </FilterSection>
          )}

          {isBuyer && (
            <FilterSection label="Seller entity type">
              {(['', 'individual', 'corporation'] as const).map(v => (
                <FilterChip
                  key={v || 'any'}
                  label={v === '' ? 'Any' : v === 'individual' ? 'Individual' : 'Corporation'}
                  active={entityType === v}
                  onClick={() => setEntityType(entityType === v && v !== '' ? '' : v)}
                />
              ))}
            </FilterSection>
          )}

          {!isBuyer && myRole && (
            <FilterSection label="Acquisition budget">
              {BUDGET_RANGES.map(r => (
                <FilterChip key={r.label} label={r.label} active={budgetRange?.label === r.label}
                  onClick={() => setBudgetRange(budgetRange?.label === r.label ? null : r)} />
              ))}
            </FilterSection>
          )}

          <FilterSection label="Products">
            {PRODUCTS.map(p => (
              <FilterChip key={p} label={p} active={selectedProducts.includes(p)}
                onClick={() => toggleItem(selectedProducts, setSelectedProducts, p)} />
            ))}
          </FilterSection>

          {isBuyer && (
            <FilterSection label="Carrier affiliations">
              {CARRIERS.map(c => (
                <FilterChip key={c} label={c} active={selectedCarriers.includes(c)}
                  onClick={() => toggleItem(selectedCarriers, setSelectedCarriers, c)} />
              ))}
            </FilterSection>
          )}

          {isBuyer && (
            <FilterSection label="Exit timeline">
              {EXIT_TIMELINES.map(t => (
                <FilterChip key={t} label={t} active={exitTimeline === t}
                  onClick={() => setExitTimeline(exitTimeline === t ? '' : t)} />
              ))}
            </FilterSection>
          )}

          {!isBuyer && myRole && (
            <FilterSection label="Acquisition timeline">
              {ACQ_TIMELINES.map(t => (
                <FilterChip key={t} label={t} active={acqTimeline === t}
                  onClick={() => setAcqTimeline(acqTimeline === t ? '' : t)} />
              ))}
            </FilterSection>
          )}
        </aside>

        {/* Main */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', marginBottom: '1.5rem', borderBottom: '1px solid #E2E6F0' }}>
            {(['browse', 'saved'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '10px 20px', fontSize: '13px',
                fontWeight: tab === t ? 600 : 400,
                fontFamily: 'DM Sans, sans-serif', background: 'none', border: 'none',
                borderBottom: tab === t ? `2px solid ${BRAND.midnight}` : '2px solid transparent',
                color: tab === t ? BRAND.midnight : '#9CA3AF',
                cursor: 'pointer', marginBottom: '-1px',
              }}>
                {t === 'browse' ? 'Browse' : `Saved${savedIds.length > 0 ? ` (${savedIds.length})` : ''}`}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
            {!loading && (
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#9CA3AF' }}>
                {displayedProfiles.length} {displayedProfiles.length === 1 ? 'result' : 'results'}
              </span>
            )}
          </div>

          {loading ? (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF', padding: '3rem 0' }}>Loading…</p>
          ) : displayedProfiles.length === 0 ? (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF', padding: '3rem 0' }}>
              {tab === 'saved' ? 'No saved profiles yet.' : 'No results match your filters.'}
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {displayedProfiles.map(p =>
                p.role === 'seller'
                  ? <SellerCard key={p.id} profile={p} />
                  : <BuyerCard key={p.id} profile={p} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  return (
    <div style={avatarStyle}>
      {url
        ? <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
        : getInitials(name)
      }
    </div>
  )
}

function SellerCard({ profile }: { profile: AgoraProfile }) {
  const d = profile.details
  const bookValue = d.aum_cad ?? d.aggregate_aum_cad ?? null
  return (
    <Link href={`/agora/marketplace/${profile.id}`} style={cardStyle}>
      <div style={{ borderLeft: `3px solid ${BRAND.voltage}`, paddingLeft: '12px', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Avatar name={profile.name} url={profile.avatar_url} />
            <div>
              <div style={cardNameStyle}>{profile.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                <span style={cardSubStyle}>
                  {profile.province}{d.years_in_business ? ` · ${d.years_in_business} yrs` : ''}
                </span>
                <span style={{
                  padding: '1px 7px', fontSize: '10px', fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
                  borderRadius: '20px', whiteSpace: 'nowrap',
                  background: profile.account_type === 'corporation' ? BRAND.ice : '#F3F4F6',
                  color: profile.account_type === 'corporation' ? BRAND.navy : '#6B7280',
                  border: `1px solid ${profile.account_type === 'corporation' ? BRAND.electric : '#E5E7EB'}`,
                }}>
                  {profile.account_type === 'corporation' ? 'Corporation' : 'Individual'}
                </span>
              </div>
            </div>
          </div>
          <span style={sellerBadge}>Seller</span>
        </div>
      </div>

      <div style={statRowStyle}>
        {bookValue !== null && <StatPill label="Book value" value={formatMoney(bookValue)} highlight />}
        {d.client_count != null && <StatPill label="Clients" value={d.client_count.toLocaleString()} />}
        {d.exit_timeline && <StatPill label="Timeline" value={d.exit_timeline} />}
        {d.sale_portion_type === 'partial' && <StatPill label="" value="Partial sale" />}
      </div>

      {(d.products?.length ?? 0) > 0 && (
        <div style={tagRowStyle}>
          <span style={tagLabelStyle}>Products</span>
          <span style={tagValueStyle}>{d.products!.join(', ')}</span>
        </div>
      )}
      {(d.carrier_affiliations?.length ?? 0) > 0 && (
        <div style={tagRowStyle}>
          <span style={tagLabelStyle}>Carriers</span>
          <span style={tagValueStyle}>{d.carrier_affiliations!.join(', ')}</span>
        </div>
      )}
    </Link>
  )
}

function BuyerCard({ profile }: { profile: AgoraProfile }) {
  const d = profile.details
  return (
    <Link href={`/agora/marketplace/${profile.id}`} style={cardStyle}>
      <div style={{ borderLeft: `3px solid ${BRAND.electric}`, paddingLeft: '12px', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Avatar name={profile.name} url={profile.avatar_url} />
            <div>
              <div style={cardNameStyle}>{profile.name}</div>
              <span style={cardSubStyle}>{profile.province}</span>
            </div>
          </div>
          <span style={buyerBadge}>Buyer</span>
        </div>
      </div>

      <div style={statRowStyle}>
        {d.acquisition_budget_cad != null && <StatPill label="Budget" value={formatMoney(d.acquisition_budget_cad)} highlight />}
        {d.acquisition_timeline && <StatPill label="Timeline" value={d.acquisition_timeline} />}
        {(d.target_provinces?.length ?? 0) > 0 && (
          <StatPill label="Target region" value={d.target_provinces!.join(', ')} />
        )}
      </div>

      {(d.products?.length ?? 0) > 0 && (
        <div style={tagRowStyle}>
          <span style={tagLabelStyle}>Products</span>
          <span style={tagValueStyle}>{d.products!.join(', ')}</span>
        </div>
      )}
    </Link>
  )
}

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-block', margin: '3px', padding: '5px 10px', fontSize: '12px',
      fontFamily: 'DM Sans, sans-serif', borderRadius: '20px', cursor: 'pointer',
      border: active ? `1.5px solid ${BRAND.electric}` : '1.5px solid #E2E6F0',
      background: active ? BRAND.ice : 'white',
      color: active ? BRAND.navy : '#6B7280',
      fontWeight: active ? 500 : 400,
    }}>
      {label}
    </button>
  )
}

function StatPill({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column', padding: '6px 10px', borderRadius: '8px',
      background: highlight ? '#FEF9EC' : '#F9FAFB',
      border: highlight ? `1px solid ${BRAND.voltage}` : '1px solid #F0F1F4',
    }}>
      {label && <span style={{ fontSize: '10px', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif', letterSpacing: '.06em', textTransform: 'uppercase' }}>{label}</span>}
      <span style={{ fontSize: '12px', fontWeight: 500, color: BRAND.midnight, fontFamily: 'DM Sans, sans-serif' }}>{value}</span>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  display: 'block', background: 'white', borderRadius: '12px',
  border: '1px solid #E2E6F0', padding: '1.25rem',
  textDecoration: 'none', color: 'inherit',
}
const avatarStyle: React.CSSProperties = {
  width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
  background: BRAND.ice, color: BRAND.navy, overflow: 'hidden',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '13px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
}
const cardNameStyle: React.CSSProperties = {
  fontFamily: 'Playfair Display, serif', fontSize: '15px', fontWeight: 600, color: BRAND.midnight,
}
const cardSubStyle: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#9CA3AF',
}
const statRowStyle: React.CSSProperties = { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }
const tagRowStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', marginTop: '8px' }
const tagLabelStyle: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 600,
  color: '#9CA3AF', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '2px',
}
const tagValueStyle: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: BRAND.midnight, lineHeight: 1.5,
}
const sellerBadge: React.CSSProperties = {
  padding: '3px 9px', fontSize: '10px', fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
  borderRadius: '20px', background: '#FEF9EC', color: '#92400E',
  border: `1px solid ${BRAND.voltage}`, whiteSpace: 'nowrap',
}
const buyerBadge: React.CSSProperties = {
  padding: '3px 9px', fontSize: '10px', fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
  borderRadius: '20px', background: BRAND.ice, color: BRAND.navy,
  border: `1px solid ${BRAND.electric}`, whiteSpace: 'nowrap',
}
const filterHeaderStyle: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600,
  color: BRAND.midnight, letterSpacing: '.04em', textTransform: 'uppercase',
}
const clearBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', fontSize: '12px', color: BRAND.electric,
  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
}
const selectStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
  borderRadius: '8px', border: '1.5px solid #E2E6F0', background: 'white',
  color: BRAND.midnight, outline: 'none',
}
