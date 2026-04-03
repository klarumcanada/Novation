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
          </div>
        </div>
      </div>
    </div>
  )
}