'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import NovationNav from '@/components/NovationNav'
import Link from 'next/link'

type AdvisorProfile = {
  id: string
  full_name: string
  province: string
  years_in_practice: number
  intent: 'selling' | 'buying'
  aum: number | null
  client_count: number | null
  transition_duration: string | null
  willing_to_stay: boolean | null
  acquisition_budget: number | null
  acquisition_timeline: string | null
  target_provinces: string[] | null
  target_cities: string[] | null
  bio: string | null
  specialties: string[]
  carrier_affiliations: string[]
  avatar_url: string | null
}

type MgaEntityInfo = {
  entity_type: string | null
  corporation_name: string | null
}

type Valuation = {
  id: string
  low_value: number
  high_value: number
  breakdown: Record<string, {
    revenue: number
    multiple_low: number
    multiple_high: number
    value_low: number
    value_high: number
  }>
  persistency_rate: number
  transition_factor: number
  total_policies: number
  active_policies: number
  calculated_at: string
}

const BRAND = {
  midnight: '#0D1B3E',
  electric: '#3B82F6',
  chalk: '#F0EDE7',
}

function formatMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toLocaleString()}`
}

const CheckIcon = () => (
  <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#3B82F6" strokeWidth="2.5">
    <polyline points="1.5,5 4,7.5 8.5,2.5" />
  </svg>
)

function getInitials(fullName: string) {
  const parts = fullName?.trim().split(' ') ?? []
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return '?'
}

function ConsentBox({ onConfirm, onCancel, label = 'I authorize — run calculation' }: { onConfirm: () => void; onCancel: () => void; label?: string }) {
  return (
    <div style={{ background: 'white', border: '1.5px solid #3B82F6', borderRadius: '10px', padding: '1rem', marginTop: '8px' }}>
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: '#0D1B3E', marginBottom: '6px' }}>Authorize data share</div>
      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#374151', lineHeight: 1.65, margin: '0 0 12px' }}>
        By proceeding, you authorize your MGA to share your in-force policy data with Klarum Novation solely for the purpose of calculating your book value. Results are visible only to you unless you choose to share them.
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={onConfirm} style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', border: 'none', background: '#0D1B3E', color: 'white', cursor: 'pointer' }}>
          {label}
        </button>
        <button onClick={onCancel} style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', border: '1px solid #E2E6F0', background: 'white', color: '#6B7280', cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

function BookValueSection({ entityType }: { entityType: string | null }) {
  const router = useRouter()
  const [valuation, setValuation] = useState<Valuation | null | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [showConsent, setShowConsent] = useState(false)

  useEffect(() => {
    fetch('/api/valuations')
      .then(r => r.json())
      .then(data => { setValuation(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function runValuation() {
    setCalculating(true)
    setShowConsent(false)
    try {
      const res = await fetch('/api/valuations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (res.ok) {
        setValuation(data.valuation)
      } else {
        alert(data.error ?? 'Could not calculate valuation.')
      }
    } catch {
      alert('Something went wrong. Please try again.')
    }
    setCalculating(false)
  }

  return (
    <div>
      <hr className="nov-divider" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div className="nov-section-label">Book Value Assessment</div>
        {valuation && (
          <button
            onClick={() => setShowConsent(true)}
            style={{ fontSize: '11px', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, color: BRAND.electric, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Recalculate
          </button>
        )}
      </div>

      {loading ? (
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#9CA3AF' }}>Loading…</p>
      ) : calculating ? (
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#9CA3AF' }}>Calculating…</p>
      ) : !valuation ? (
        <div style={{ background: '#F8FAFF', border: '1.5px dashed #BFDBFE', borderRadius: '10px', padding: '1.25rem' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#374151', margin: '0 0 12px', lineHeight: 1.65 }}>
            Get an indicative valuation range for your book of business based on your in-force policy data, product mix, and persistency rate.
          </p>
          {!showConsent ? (
            <button
              onClick={() => setShowConsent(true)}
              style={{ padding: '9px 18px', fontSize: '13px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', border: 'none', background: BRAND.electric, color: 'white', cursor: 'pointer' }}
            >
              Calculate Book Value
            </button>
          ) : (
            <ConsentBox onConfirm={runValuation} onCancel={() => setShowConsent(false)} />
          )}
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '10px' }}>
            {entityType === 'corporation' && (
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', fontSize: '11px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', borderRadius: '20px', background: '#DBEAFE', color: '#1A3266', border: `1px solid ${BRAND.electric}`, marginBottom: '8px' }}>
                Corporate book
              </span>
            )}
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '26px', fontWeight: 600, color: BRAND.midnight }}>
              {formatMoney(valuation.low_value)} – {formatMoney(valuation.high_value)}
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#9CA3AF', marginTop: '3px' }}>
              {valuation.active_policies} active / {valuation.total_policies} total policies · {Math.round(valuation.persistency_rate * 100)}% persistency
              {valuation.transition_factor > 0 && ' · Stay-on premium applied'}
            </div>
          </div>
          <button
            onClick={() => router.push('/valuation/report')}
            style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', border: `1.5px solid ${BRAND.electric}`, background: 'white', color: BRAND.electric, cursor: 'pointer', marginBottom: '8px' }}
          >
            View Full Report →
          </button>
          {showConsent && <ConsentBox onConfirm={runValuation} onCancel={() => setShowConsent(false)} label="I authorize — recalculate" />}
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#9CA3AF', marginTop: '6px' }}>
            Calculated {new Date(valuation.calculated_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })} · Indicative only
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProfilePage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [profile, setProfile] = useState<AdvisorProfile | null>(null)
  const [entityInfo, setEntityInfo] = useState<MgaEntityInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('advisors')
        .select('*')
        .eq('id', user.id)
        .single()
      if (data) setProfile(data)

      const { data: mgaRecord } = await supabase
        .from('mga_advisors')
        .select('entity_type, corporation_name')
        .eq('email', user.email)
        .limit(1)
        .maybeSingle()
      if (mgaRecord?.entity_type) setEntityInfo(mgaRecord)

      setLoading(false)
    }
    fetchProfile()
  }, [supabase])

  if (loading) return (
    <div style={{ background: '#F8F7F4', minHeight: '100vh' }}>
      <NovationNav />
      <div className="nov-page-body">
        <div className="nov-loading">Loading your profile…</div>
      </div>
    </div>
  )

  if (!profile) return (
    <div style={{ background: '#F8F7F4', minHeight: '100vh' }}>
      <NovationNav />
      <div className="nov-page-body">
        <div className="nov-loading">Profile not found.</div>
      </div>
    </div>
  )

  const isSeller = profile.intent === 'selling'

  return (
    <div style={{ background: '#F8F7F4', minHeight: '100vh', paddingBottom: '4rem' }}>
      <NovationNav />

      <div className="nov-page-body">
        <div className="nov-profile-card">

          {/* Header */}
          <div className="nov-profile-header">
            <div className="nov-profile-top">
              <div className="nov-avatar" style={{ overflow: 'hidden', padding: 0 }}>
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt={profile.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : getInitials(profile.full_name)
                }
              </div>
              <div className="nov-profile-meta" style={{ flex: 1 }}>
                <div className="nov-profile-name">{profile.full_name}</div>
                <div className="nov-profile-sub-row">
                  <span className="nov-profile-sub">
                    {profile.province}&nbsp;&nbsp;·&nbsp;&nbsp;{profile.years_in_practice} years in practice
                  </span>
                </div>
                <span className="nov-product-badge">
                  {isSeller ? 'Seller' : 'Buyer'}
                </span>
              </div>
              <Link
                href="/profile/edit"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '8px 14px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 500, color: '#0D1B3E', textDecoration: 'none',
                  border: '1.5px solid #E5E7EB', borderRadius: '8px', background: 'white',
                  whiteSpace: 'nowrap', alignSelf: 'flex-start',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit
              </Link>
            </div>

            {/* Stat boxes */}
            <div className="nov-stat-grid">
              {isSeller ? (
                <>
                  <div className="nov-stat-box">
                    <div className="nov-stat-label">AUM</div>
                    <div className="nov-stat-val">{profile.aum ? `$${profile.aum.toLocaleString()}` : '—'}</div>
                  </div>
                  <div className="nov-stat-box">
                    <div className="nov-stat-label">Clients</div>
                    <div className="nov-stat-val">{profile.client_count?.toLocaleString() ?? '—'}</div>
                  </div>
                  <div className="nov-stat-box">
                    <div className="nov-stat-label">Transition window</div>
                    <div className="nov-stat-val">{profile.transition_duration ?? '—'}</div>
                  </div>
                  <div className="nov-stat-box">
                    <div className="nov-stat-label">Target geography</div>
                    <div className="nov-stat-val">{profile.target_provinces?.join(', ') ?? '—'}</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="nov-stat-box">
                    <div className="nov-stat-label">Acquisition budget</div>
                    <div className="nov-stat-val">{profile.acquisition_budget ? `$${profile.acquisition_budget.toLocaleString()}` : '—'}</div>
                  </div>
                  <div className="nov-stat-box">
                    <div className="nov-stat-label">Acquisition timeline</div>
                    <div className="nov-stat-val">{profile.acquisition_timeline ?? '—'}</div>
                  </div>
                  <div className="nov-stat-box">
                    <div className="nov-stat-label">Target geography</div>
                    <div className="nov-stat-val">{profile.target_provinces?.join(', ') ?? '—'}</div>
                  </div>
                  <div className="nov-stat-box">
                    <div className="nov-stat-label">Years in practice</div>
                    <div className="nov-stat-val">{profile.years_in_practice}</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="nov-profile-body">
            <div className="nov-section-header">
              <span className="nov-section-label">About</span>
            </div>
            <div className="nov-bio-text">
              {profile.bio ?? (
                <span style={{ color: '#CBD5E1', fontStyle: 'italic' }}>
                  No bio added yet.{' '}
                  <Link href="/profile/edit" style={{ color: '#3B82F6' }}>Add one →</Link>
                </span>
              )}
            </div>

            {isSeller && profile.willing_to_stay && (
              <div className="nov-stay-row">
                <div className="nov-stay-check"><CheckIcon /></div>
                <span className="nov-stay-text">Open to staying on post-sale during transition</span>
              </div>
            )}

            <hr className="nov-divider" />

            <div className="nov-section-label" style={{ marginBottom: '10px' }}>Specialties</div>
            <div className="nov-pill-row" style={{ marginBottom: '24px' }}>
              {profile.specialties?.length > 0
                ? profile.specialties.map(s => <span key={s} className="nov-pill nov-pill-blue">{s}</span>)
                : <span className="nov-pill" style={{ color: '#CBD5E1' }}>None added</span>
              }
            </div>

            <div className="nov-section-label" style={{ marginBottom: '10px' }}>Carrier affiliations</div>
            <div className="nov-pill-row">
              {profile.carrier_affiliations?.length > 0
                ? profile.carrier_affiliations.map(c => <span key={c} className="nov-pill">{c}</span>)
                : <span className="nov-pill" style={{ color: '#CBD5E1' }}>None added</span>
              }
            </div>

            {entityInfo && (
              <>
                <hr className="nov-divider" />
                <div className="nov-section-label" style={{ marginBottom: '10px' }}>Entity Type</div>
                <div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '4px 12px', fontSize: '12px', fontWeight: 500,
                    fontFamily: 'DM Sans, sans-serif', borderRadius: '20px',
                    background: entityInfo.entity_type === 'corporation' ? '#DBEAFE' : '#F3F4F6',
                    color: entityInfo.entity_type === 'corporation' ? '#1D4ED8' : '#374151',
                    border: `1px solid ${entityInfo.entity_type === 'corporation' ? '#BFDBFE' : '#E5E7EB'}`,
                  }}>
                    {entityInfo.entity_type === 'corporation' ? 'Corporation' : 'Individual'}
                  </span>
                </div>
                {entityInfo.entity_type === 'corporation' && entityInfo.corporation_name && (
                  <div style={{ marginTop: '14px' }}>
                    <div className="nov-section-label" style={{ marginBottom: '6px' }}>Corporation Name</div>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#0D1B3E' }}>
                      {entityInfo.corporation_name}
                    </div>
                  </div>
                )}
              </>
            )}

            {isSeller && <BookValueSection entityType={entityInfo?.entity_type ?? null} />}
          </div>
        </div>
      </div>
    </div>
  )
}