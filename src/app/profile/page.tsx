'use client'

import { useEffect, useState } from 'react'
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

type Valuation = {
  id: string
  low_value: number
  high_value: number
  breakdown: Record<string, { revenue: number; multiple_low: number; multiple_high: number; value_low: number; value_high: number }>
  persistency_rate: number
  transition_factor: number
  total_policies: number
  active_policies: number
  calculated_at: string
}

const PRODUCT_LABELS: Record<string, string> = {
  life: 'Life Insurance',
  disability: 'Disability',
  critical_illness: 'Critical Illness',
  health: 'Health',
  seg_funds: 'Seg Funds',
}

function formatMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toLocaleString()}`
}

const BRAND = {
  midnight: '#0D1B3E',
  electric: '#3B82F6',
  chalk: '#F0EDE7',
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

function BookValueSection() {
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
    const res = await fetch('/api/valuations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const data = await res.json()
    if (res.ok) setValuation(data.valuation)
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
            style={{
              fontSize: '11px', fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
              color: BRAND.electric, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}
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
              style={{
                padding: '9px 18px', fontSize: '13px', fontWeight: 600,
                fontFamily: 'DM Sans, sans-serif', borderRadius: '8px',
                border: 'none', background: BRAND.electric, color: 'white', cursor: 'pointer',
              }}
            >
              Calculate Book Value
            </button>
          ) : (
            <div style={{ background: 'white', border: `1.5px solid ${BRAND.electric}`, borderRadius: '10px', padding: '1rem' }}>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: BRAND.midnight, marginBottom: '6px' }}>
                Authorize data share
              </div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#374151', lineHeight: 1.65, margin: '0 0 12px' }}>
                By proceeding, you authorize your MGA to share your in-force policy data with Klarum Novation solely for the purpose of calculating your book value. Results are visible only to you unless you choose to share them.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={runValuation}
                  style={{
                    padding: '8px 16px', fontSize: '12px', fontWeight: 600,
                    fontFamily: 'DM Sans, sans-serif', borderRadius: '8px',
                    border: 'none', background: BRAND.midnight, color: 'white', cursor: 'pointer',
                  }}
                >
                  I authorize — run calculation
                </button>
                <button
                  onClick={() => setShowConsent(false)}
                  style={{
                    padding: '8px 16px', fontSize: '12px', fontWeight: 500,
                    fontFamily: 'DM Sans, sans-serif', borderRadius: '8px',
                    border: '1px solid #E2E6F0', background: 'white', color: '#6B7280', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '26px', fontWeight: 600, color: BRAND.midnight }}>
              {formatMoney(valuation.low_value)} – {formatMoney(valuation.high_value)}
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#9CA3AF', marginTop: '3px' }}>
              {valuation.active_policies} active / {valuation.total_policies} total policies · {Math.round(valuation.persistency_rate * 100)}% persistency
              {valuation.transition_factor > 0 && ' · Stay-on premium applied'}
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #E2E6F0', overflow: 'hidden', marginBottom: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 0 }}>
              {['Product', 'Revenue', 'Multiple', 'Value Range'].map(h => (
                <div key={h} style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.06em', textTransform: 'uppercase', padding: '8px 12px', borderBottom: '1px solid #F3F4F6', background: '#FAFAFA' }}>
                  {h}
                </div>
              ))}
              {Object.entries(valuation.breakdown).map(([type, row], i) => (
                <>
                  <div key={`${type}-name`} style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: BRAND.midnight, fontWeight: 500, padding: '9px 12px', borderBottom: i < Object.keys(valuation.breakdown).length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                    {PRODUCT_LABELS[type] ?? type}
                  </div>
                  <div key={`${type}-rev`} style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#374151', padding: '9px 12px', textAlign: 'right', borderBottom: i < Object.keys(valuation.breakdown).length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                    {formatMoney(row.revenue)}
                  </div>
                  <div key={`${type}-mult`} style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#374151', padding: '9px 12px', textAlign: 'right', borderBottom: i < Object.keys(valuation.breakdown).length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                    {row.multiple_low}x – {row.multiple_high}x
                  </div>
                  <div key={`${type}-val`} style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: BRAND.midnight, fontWeight: 600, padding: '9px 12px', textAlign: 'right', borderBottom: i < Object.keys(valuation.breakdown).length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                    {formatMoney(row.value_low)} – {formatMoney(row.value_high)}
                  </div>
                </>
              ))}
            </div>
          </div>

          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#9CA3AF' }}>
            Calculated {new Date(valuation.calculated_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })} · Indicative range only, not a formal appraisal
          </div>

          {showConsent && (
            <div style={{ background: 'white', border: `1.5px solid ${BRAND.electric}`, borderRadius: '10px', padding: '1rem', marginTop: '12px' }}>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: BRAND.midnight, marginBottom: '6px' }}>
                Recalculate — authorize data share
              </div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#374151', lineHeight: 1.65, margin: '0 0 12px' }}>
                This will pull your current in-force policy data and update your valuation.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={runValuation} style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', border: 'none', background: BRAND.midnight, color: 'white', cursor: 'pointer' }}>
                  I authorize — recalculate
                </button>
                <button onClick={() => setShowConsent(false)} style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', border: '1px solid #E2E6F0', background: 'white', color: '#6B7280', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
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

            {isSeller && <BookValueSection />}
          </div>
        </div>
      </div>
    </div>
  )
}