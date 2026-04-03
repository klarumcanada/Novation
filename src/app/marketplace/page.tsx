'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import NovationNav from '@/components/NovationNav'
import { SPECIALTIES, CARRIERS } from '@/lib/validations'

const BRAND = {
  midnight: '#0D1B3E',
  navy: '#1A3266',
  electric: '#3B82F6',
  ice: '#DBEAFE',
  chalk: '#F8F7F4',
  voltage: '#E8C547',
}

const PROVINCES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT']

const AUM_RANGES = [
  { label: 'Under $10M', min: 0, max: 10 },
  { label: '$10M – $25M', min: 10, max: 25 },
  { label: '$25M – $50M', min: 25, max: 50 },
  { label: '$50M – $100M', min: 50, max: 100 },
  { label: 'Over $100M', min: 100, max: undefined },
]

const BUDGET_RANGES = [
  { label: 'Under $500K', min: 0, max: 0.5 },
  { label: '$500K – $1M', min: 0.5, max: 1 },
  { label: '$1M – $2M', min: 1, max: 2 },
  { label: '$2M – $5M', min: 2, max: 5 },
  { label: 'Over $5M', min: 5, max: undefined },
]

const TRANSITION_TIMELINES = ['0–6 months', '6–12 months', '1–2 years', '2+ years']
const ACQUISITION_TIMELINES = ['0–6 months', '6–12 months', '1–2 years', '2+ years']

type Advisor = {
  id: string
  full_name: string
  province: string
  years_in_practice: number
  intent: string
  aum: number | null
  client_count: number | null
  transition_duration: string | null
  willing_to_stay: boolean | null
  acquisition_budget: number | null
  acquisition_timeline: string | null
  target_provinces: string[] | null
  target_cities: string[] | null
  specialties: string[]
  carrier_affiliations: string[]
  bio: string | null
  avatar_url: string | null
}

function formatAUM(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toLocaleString()}`
}

function getInitials(fullName: string) {
  const parts = fullName?.trim().split(' ') ?? []
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return '?'
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

export default function MarketplacePage() {
  const router = useRouter()
  const [advisors, setAdvisors] = useState<Advisor[]>([])
  const [savedAdvisors, setSavedAdvisors] = useState<Advisor[]>([])
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [myIntent, setMyIntent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'browse' | 'saved'>('browse')

  const [province, setProvince] = useState('')
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
  const [selectedCarriers, setSelectedCarriers] = useState<string[]>([])
  const [aumRange, setAumRange] = useState<typeof AUM_RANGES[0] | null>(null)
  const [budgetRange, setBudgetRange] = useState<typeof BUDGET_RANGES[0] | null>(null)
  const [minYears, setMinYears] = useState('')
  const [maxYears, setMaxYears] = useState('')
  const [timeline, setTimeline] = useState('')

  const fetchAdvisors = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (province) params.set('province', province)
    if (selectedSpecialties.length) params.set('specialties', selectedSpecialties.join(','))
    if (selectedCarriers.length) params.set('carriers', selectedCarriers.join(','))
    if (aumRange?.min !== undefined) params.set('minAum', String(aumRange.min))
    if (aumRange?.max !== undefined) params.set('maxAum', String(aumRange.max))
    if (budgetRange?.min !== undefined) params.set('minBudget', String(budgetRange.min))
    if (budgetRange?.max !== undefined) params.set('maxBudget', String(budgetRange.max))
    if (minYears) params.set('minYears', minYears)
    if (maxYears) params.set('maxYears', maxYears)
    if (timeline) params.set('timeline', timeline)

    const [res, savesRes] = await Promise.all([
      fetch(`/api/marketplace?${params.toString()}`),
      fetch('/api/saves'),
    ])

    const data = await res.json()
    const savesData = await savesRes.json()

    setAdvisors(data.advisors ?? [])
    setMyIntent(data.myIntent ?? null)
    setSavedIds(savesData.saved ?? [])
    setLoading(false)
  }, [province, selectedSpecialties, selectedCarriers, aumRange, budgetRange, minYears, maxYears, timeline])

  useEffect(() => {
    if (savedIds.length === 0) { setSavedAdvisors([]); return }
    const saved = advisors.filter(a => savedIds.includes(a.id))
    setSavedAdvisors(saved)
  }, [savedIds, advisors])

  useEffect(() => {
    fetchAdvisors()
  }, [fetchAdvisors])

  const isSeller = myIntent === 'selling'

  function toggleItem(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value])
  }

  function clearFilters() {
    setProvince('')
    setSelectedSpecialties([])
    setSelectedCarriers([])
    setAumRange(null)
    setBudgetRange(null)
    setMinYears('')
    setMaxYears('')
    setTimeline('')
  }

  const displayedAdvisors = tab === 'saved' ? savedAdvisors : advisors

  return (
    <div style={{ background: BRAND.chalk, minHeight: '100vh' }}>
      <NovationNav />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 1.5rem', display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>

        {/* Filters panel */}
        <div style={{
          width: '240px', flexShrink: 0, background: 'white',
          borderRadius: '12px', border: '1px solid #E5E7EB',
          padding: '1.5rem', position: 'sticky', top: '1.5rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: BRAND.midnight, letterSpacing: '.04em', textTransform: 'uppercase' }}>
              Filters
            </span>
            <button onClick={clearFilters} style={{ background: 'none', border: 'none', fontSize: '12px', color: BRAND.electric, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Clear all
            </button>
          </div>

          <FilterSection label="Province">
            <select value={province} onChange={e => setProvince(e.target.value)} style={selectStyle}>
              <option value="">All provinces</option>
              {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </FilterSection>

          {!isSeller && (
            <FilterSection label="AUM Range">
              {AUM_RANGES.map(r => (
                <FilterChip key={r.label} label={r.label} active={aumRange?.label === r.label}
                  onClick={() => setAumRange(aumRange?.label === r.label ? null : r)} />
              ))}
            </FilterSection>
          )}

          {isSeller && (
            <FilterSection label="Acquisition Budget">
              {BUDGET_RANGES.map(r => (
                <FilterChip key={r.label} label={r.label} active={budgetRange?.label === r.label}
                  onClick={() => setBudgetRange(budgetRange?.label === r.label ? null : r)} />
              ))}
            </FilterSection>
          )}

          <FilterSection label="Specialties">
            {SPECIALTIES.map(s => (
              <FilterChip key={s} label={s} active={selectedSpecialties.includes(s)}
                onClick={() => toggleItem(selectedSpecialties, setSelectedSpecialties, s)} />
            ))}
          </FilterSection>

          {!isSeller && (
            <FilterSection label="Carriers">
              {CARRIERS.map(c => (
                <FilterChip key={c} label={c} active={selectedCarriers.includes(c)}
                  onClick={() => toggleItem(selectedCarriers, setSelectedCarriers, c)} />
              ))}
            </FilterSection>
          )}

          {!isSeller && (
            <FilterSection label="Transition Timeline">
              {TRANSITION_TIMELINES.map(t => (
                <FilterChip key={t} label={t} active={timeline === t}
                  onClick={() => setTimeline(timeline === t ? '' : t)} />
              ))}
            </FilterSection>
          )}

          {isSeller && (
            <FilterSection label="Years in Practice">
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="number" placeholder="Min" value={minYears}
                  onChange={e => setMinYears(e.target.value)} style={{ ...inputStyle, width: '70px' }} />
                <span style={{ color: '#9CA3AF', fontSize: '12px' }}>to</span>
                <input type="number" placeholder="Max" value={maxYears}
                  onChange={e => setMaxYears(e.target.value)} style={{ ...inputStyle, width: '70px' }} />
              </div>
            </FilterSection>
          )}

          {isSeller && (
            <FilterSection label="Acquisition Timeline">
              {ACQUISITION_TIMELINES.map(t => (
                <FilterChip key={t} label={t} active={timeline === t}
                  onClick={() => setTimeline(timeline === t ? '' : t)} />
              ))}
            </FilterSection>
          )}
        </div>

        {/* Cards panel */}
        <div style={{ flex: 1 }}>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '1px solid #E5E7EB' }}>
            <button
              onClick={() => setTab('browse')}
              style={{
                padding: '10px 20px', fontSize: '13px', fontWeight: tab === 'browse' ? 600 : 400,
                fontFamily: 'DM Sans, sans-serif', background: 'none', border: 'none',
                borderBottom: tab === 'browse' ? `2px solid ${BRAND.midnight}` : '2px solid transparent',
                color: tab === 'browse' ? BRAND.midnight : '#9CA3AF',
                cursor: 'pointer', marginBottom: '-1px', transition: 'all .15s',
              }}
            >
              Browse
            </button>
            <button
              onClick={() => setTab('saved')}
              style={{
                padding: '10px 20px', fontSize: '13px', fontWeight: tab === 'saved' ? 600 : 400,
                fontFamily: 'DM Sans, sans-serif', background: 'none', border: 'none',
                borderBottom: tab === 'saved' ? `2px solid ${BRAND.midnight}` : '2px solid transparent',
                color: tab === 'saved' ? BRAND.midnight : '#9CA3AF',
                cursor: 'pointer', marginBottom: '-1px', transition: 'all .15s',
              }}
            >
              Saved {savedIds.length > 0 && `(${savedIds.length})`}
            </button>
          </div>

          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
            {!loading && (
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#9CA3AF' }}>
                {displayedAdvisors.length} {displayedAdvisors.length === 1 ? 'result' : 'results'}
              </span>
            )}
          </div>

          {loading ? (
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF', padding: '3rem 0' }}>Loading…</div>
          ) : displayedAdvisors.length === 0 ? (
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF', padding: '3rem 0' }}>
              {tab === 'saved' ? 'No saved profiles yet.' : 'No results match your filters.'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {displayedAdvisors.map(a => (
                isSeller
                  ? <BuyerCard key={a.id} advisor={a} onClick={() => router.push(`/marketplace/${a.id}`)} />
                  : <SellerCard key={a.id} advisor={a} onClick={() => router.push(`/marketplace/${a.id}`)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SellerCard({ advisor, onClick }: { advisor: Advisor; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{ ...cardStyle, cursor: 'pointer' }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.1)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div style={{ borderLeft: `3px solid ${BRAND.voltage}`, paddingLeft: '12px', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Avatar name={advisor.full_name} url={advisor.avatar_url} />
            <div>
              <div style={cardNameStyle}>{advisor.full_name}</div>
              <div style={cardSubStyle}>{advisor.province} · {advisor.years_in_practice} yrs</div>
            </div>
          </div>
          <span style={sellerBadge}>Seller</span>
        </div>
      </div>

      <div style={statRowStyle}>
        {advisor.aum && <StatPill label="AUM" value={formatAUM(advisor.aum)} />}
        {advisor.client_count && <StatPill label="Clients" value={advisor.client_count.toLocaleString()} />}
        {advisor.transition_duration && <StatPill label="Timeline" value={advisor.transition_duration} />}
        {advisor.willing_to_stay && <StatPill label="" value="Open to staying on" highlight />}
      </div>

      {advisor.specialties?.length > 0 && (
        <div style={listSectionStyle}>
          <span style={listLabelStyle}>Specialties</span>
          <span style={listValueStyle}>{advisor.specialties.join(', ')}</span>
        </div>
      )}

      {advisor.carrier_affiliations?.length > 0 && (
        <div style={listSectionStyle}>
          <span style={listLabelStyle}>Carriers</span>
          <span style={listValueStyle}>{advisor.carrier_affiliations.join(', ')}</span>
        </div>
      )}
    </div>
  )
}

function BuyerCard({ advisor, onClick }: { advisor: Advisor; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{ ...cardStyle, cursor: 'pointer' }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.1)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div style={{ borderLeft: `3px solid ${BRAND.voltage}`, paddingLeft: '12px', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Avatar name={advisor.full_name} url={advisor.avatar_url} />
            <div>
              <div style={cardNameStyle}>{advisor.full_name}</div>
              <div style={cardSubStyle}>{advisor.province} · {advisor.years_in_practice} yrs</div>
            </div>
          </div>
          <span style={buyerBadge}>Buyer</span>
        </div>
      </div>

      <div style={statRowStyle}>
        {advisor.acquisition_budget && <StatPill label="Budget" value={formatAUM(advisor.acquisition_budget)} />}
        {advisor.acquisition_timeline && <StatPill label="Timeline" value={advisor.acquisition_timeline} />}
        {advisor.target_provinces && advisor.target_provinces.length > 0 && (
          <StatPill label="Target region" value={advisor.target_provinces.join(', ')} />
        )}
      </div>

      {advisor.specialties?.length > 0 && (
        <div style={listSectionStyle}>
          <span style={listLabelStyle}>Specialties</span>
          <span style={listValueStyle}>{advisor.specialties.join(', ')}</span>
        </div>
      )}

      {advisor.carrier_affiliations?.length > 0 && (
        <div style={listSectionStyle}>
          <span style={listLabelStyle}>Carriers</span>
          <span style={listValueStyle}>{advisor.carrier_affiliations.join(', ')}</span>
        </div>
      )}
    </div>
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
      fontFamily: 'DM Sans, sans-serif', borderRadius: '20px',
      border: active ? `1.5px solid ${BRAND.electric}` : '1.5px solid #E5E7EB',
      background: active ? BRAND.ice : 'white',
      color: active ? BRAND.navy : '#6B7280',
      cursor: 'pointer', fontWeight: active ? 500 : 400, transition: 'all .1s',
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
      border: highlight ? `1px solid ${BRAND.voltage}` : '1px solid #F3F4F6',
    }}>
      {label && <span style={{ fontSize: '10px', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif', letterSpacing: '.06em', textTransform: 'uppercase' }}>{label}</span>}
      <span style={{ fontSize: '12px', fontWeight: 500, color: BRAND.midnight, fontFamily: 'DM Sans, sans-serif' }}>{value}</span>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: 'white', borderRadius: '12px', border: '1px solid #E5E7EB',
  padding: '1.25rem', transition: 'box-shadow .15s',
}

const avatarStyle: React.CSSProperties = {
  width: '38px', height: '38px', borderRadius: '50%', background: BRAND.ice, color: BRAND.navy,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '13px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', flexShrink: 0, overflow: 'hidden',
}

const cardNameStyle: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 600, color: BRAND.midnight,
}

const cardSubStyle: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#9CA3AF', marginTop: '2px',
}

const statRowStyle: React.CSSProperties = {
  display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px',
}

const listSectionStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', marginTop: '8px',
}

const listLabelStyle: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 600,
  color: '#9CA3AF', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '2px',
}

const listValueStyle: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: BRAND.midnight, lineHeight: 1.5,
}

const sellerBadge: React.CSSProperties = {
  padding: '3px 9px', fontSize: '10px', fontFamily: 'DM Sans, sans-serif',
  borderRadius: '20px', background: '#FEF9EC', color: '#92400E',
  border: `1px solid ${BRAND.voltage}`, fontWeight: 500, whiteSpace: 'nowrap',
}

const buyerBadge: React.CSSProperties = {
  padding: '3px 9px', fontSize: '10px', fontFamily: 'DM Sans, sans-serif',
  borderRadius: '20px', background: BRAND.ice, color: BRAND.navy,
  border: `1px solid ${BRAND.electric}`, fontWeight: 500, whiteSpace: 'nowrap',
}

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
  borderRadius: '8px', border: '1.5px solid #E5E7EB', background: 'white', color: BRAND.midnight, outline: 'none',
}

const inputStyle: React.CSSProperties = {
  padding: '7px 10px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
  borderRadius: '8px', border: '1.5px solid #E5E7EB', background: 'white', color: BRAND.midnight, outline: 'none',
}