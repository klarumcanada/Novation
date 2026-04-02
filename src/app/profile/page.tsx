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
  aum_value: number | null
  aum_unit: string | null
  client_count: number | null
  transition_duration: string | null
  stay_on_postsale: boolean | null
  acq_budget_value: number | null
  acq_budget_unit: string | null
  acq_timeline: string | null
  buyer_geo_pref: string[] | null
  acq_geo_pref: string[] | null
  bio: string | null
  specialties: string[]
  carrier_affiliations: string[]
  avatar_url: string | null
}

const TIMELINE_LABELS: Record<string, string> = {
  '3mo': '3 months', '6mo': '6 months', '12mo': '12 months', '18mo+': '18+ months',
}

const ACQ_TIMELINE_LABELS: Record<string, string> = {
  '0-3mo': '0–3 months', '3-6mo': '3–6 months', '6-12mo': '6–12 months', '12mo+': '12+ months',
}

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="nov-edit-icon">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

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

function formatAUM(value: number, unit: string | null) {
  const label = unit === 'thousands' ? 'K' : 'M'
  return `$${value}${label}`
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
        <div className="nov-page-action-row">
          <Link href="/profile/public" className="nov-btn-primary">
            Preview My Public Listing →
          </Link>
        </div>

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
              <div className="nov-profile-meta">
                <div className="nov-profile-name">{profile.full_name}</div>
                <div className="nov-profile-sub-row">
                  <span className="nov-profile-sub">
                    {profile.province}&nbsp;&nbsp;·&nbsp;&nbsp;{profile.years_in_practice} years in practice
                  </span>
                  <Link href="/profile/edit" title="Edit details">
                    <EditIcon />
                  </Link>
                </div>
                <span className="nov-product-badge">
                  {isSeller ? 'Seller' : 'Buyer'}
                </span>
              </div>
            </div>

            {/* Stat boxes */}
            <div className="nov-stat-grid">
              {isSeller ? (
                <>
                  <div className="nov-stat-box">
                    <div className="nov-stat-label">AUM</div>
                    <div className="nov-stat-val">{profile.aum_value ? formatAUM(profile.aum_value, profile.aum_unit) : '—'}</div>
                  </div>
                  <div className="nov-stat-box">
                    <div className="nov-stat-label">Clients</div>
                    <div className="nov-stat-val">{profile.client_count?.toLocaleString() ?? '—'}</div>
                  </div>
                  <div className="nov-stat-box">
                    <div className="nov-stat-label">Transition window</div>
                    <div className="nov-stat-val">{profile.transition_duration ? (TIMELINE_LABELS[profile.transition_duration] ?? profile.transition_duration) : '—'}</div>
                  </div>
                  <div className="nov-stat-box">
                    <div className="nov-stat-label">Target buyer province</div>
                    <div className="nov-stat-val">{profile.buyer_geo_pref?.join(', ') ?? '—'}</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="nov-stat-box">
                    <div className="nov-stat-label">Acquisition budget</div>
                    <div className="nov-stat-val">{profile.acq_budget_value ? formatAUM(profile.acq_budget_value, profile.acq_budget_unit) : '—'}</div>
                  </div>
                  <div className="nov-stat-box">
                    <div className="nov-stat-label">Acquisition timeline</div>
                    <div className="nov-stat-val">{profile.acq_timeline ? (ACQ_TIMELINE_LABELS[profile.acq_timeline] ?? profile.acq_timeline) : '—'}</div>
                  </div>
                  <div className="nov-stat-box">
                    <div className="nov-stat-label">Target geography</div>
                    <div className="nov-stat-val">{profile.acq_geo_pref?.join(', ') ?? '—'}</div>
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
              <Link href="/profile/edit" title="Edit bio"><EditIcon /></Link>
            </div>
            <div className="nov-bio-text">
              {profile.bio ?? (
                <span style={{ color: '#CBD5E1', fontStyle: 'italic' }}>
                  No bio added yet.{' '}
                  <Link href="/profile/edit" style={{ color: '#3B82F6' }}>Add one →</Link>
                </span>
              )}
            </div>

            {isSeller && profile.stay_on_postsale && (
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
          </div>
        </div>
      </div>
    </div>
  )
}