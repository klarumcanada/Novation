'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import NovationNav from '@/components/NovationNav'
import Link from 'next/link'

const BRAND = {
  midnight: '#0D1B3E',
  navy: '#1A3266',
  electric: '#3B82F6',
  ice: '#DBEAFE',
  chalk: '#F8F7F4',
  voltage: '#E8C547',
}

const TIMELINE_LABELS: Record<string, string> = {
  '3mo': '3 months', '6mo': '6 months', '12mo': '12 months', '18mo+': '18+ months',
}

const ACQ_TIMELINE_LABELS: Record<string, string> = {
  '0-3mo': '0–3 months', '3-6mo': '3–6 months', '6-12mo': '6–12 months', '12mo+': '12+ months',
}

type Advisor = {
  full_name: string
  province: string
  years_in_practice: number
  intent: string
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
  specialties: string[]
  carrier_affiliations: string[]
  bio: string | null
  avatar_url: string | null
}

function formatAUM(value: number, unit: string | null) {
  const label = unit === 'thousands' ? 'K' : 'M'
  return `$${value}${label}`
}

function getInitials(fullName: string) {
  const parts = fullName?.trim().split(' ') ?? []
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return '?'
}

export default function PublicProfilePage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [profile, setProfile] = useState<Advisor | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('advisors').select('*').eq('id', user.id).single()
      if (data) setProfile(data)
      setLoading(false)
    }
    fetchProfile()
  }, [supabase])

  if (loading) return (
    <div style={{ background: BRAND.chalk, minHeight: '100vh' }}>
      <NovationNav />
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF' }}>Loading…</p>
      </div>
    </div>
  )

  if (!profile) return (
    <div style={{ background: BRAND.chalk, minHeight: '100vh' }}>
      <NovationNav />
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF' }}>Profile not found.</p>
      </div>
    </div>
  )

  const isSeller = profile.intent === 'selling'

  return (
    <div style={{ background: BRAND.chalk, minHeight: '100vh', paddingBottom: '4rem' }}>
      <NovationNav />

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>

        {/* Preview banner */}
        <div style={{
          background: BRAND.voltage + '22', border: `1px solid ${BRAND.voltage}`,
          borderRadius: '10px', padding: '12px 16px', marginBottom: '2rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: BRAND.midnight, fontWeight: 500 }}>
            This is how your listing appears to others in the marketplace.
          </span>
          <Link href="/profile" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: BRAND.electric, textDecoration: 'none' }}>
            ← Back to profile
          </Link>
        </div>

        {/* Card */}
        <div style={{
          background: 'white', borderRadius: '16px', border: '1px solid #E5E7EB',
          overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,.06)',
        }}>
          {/* Card header */}
          <div style={{ padding: '2rem', borderBottom: '1px solid #F3F4F6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  background: BRAND.ice, color: BRAND.navy,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
                  flexShrink: 0, overflow: 'hidden', border: '2px solid #E5E7EB',
                }}>
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt={profile.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : getInitials(profile.full_name)
                  }
                </div>
                <div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 400, color: BRAND.midnight }}>
                    {profile.full_name}
                  </div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#9CA3AF', marginTop: '3px' }}>
                    {profile.province} · {profile.years_in_practice} years in practice
                  </div>
                </div>
              </div>
              <span style={{
                padding: '5px 12px', fontSize: '11px', fontWeight: 500,
                fontFamily: 'DM Sans, sans-serif', borderRadius: '20px',
                background: isSeller ? '#FEF9EC' : BRAND.ice,
                color: isSeller ? '#92400E' : BRAND.navy,
                border: `1px solid ${isSeller ? BRAND.voltage : BRAND.electric}`,
              }}>
                {isSeller ? 'Selling' : 'Acquiring'}
              </span>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {isSeller ? (
                <>
                  {profile.aum_value && <StatBox label="AUM" value={formatAUM(profile.aum_value, profile.aum_unit)} />}
                  {profile.client_count && <StatBox label="Clients" value={profile.client_count.toLocaleString()} />}
                  {profile.transition_duration && <StatBox label="Timeline" value={TIMELINE_LABELS[profile.transition_duration] ?? profile.transition_duration} />}
                  {profile.stay_on_postsale && <StatBox label="" value="Open to staying on" highlight />}
                  {profile.buyer_geo_pref && profile.buyer_geo_pref.length > 0 && <StatBox label="Target region" value={profile.buyer_geo_pref.join(', ')} />}
                </>
              ) : (
                <>
                  {profile.acq_budget_value && <StatBox label="Budget" value={formatAUM(profile.acq_budget_value, profile.acq_budget_unit)} />}
                  {profile.acq_timeline && <StatBox label="Timeline" value={ACQ_TIMELINE_LABELS[profile.acq_timeline] ?? profile.acq_timeline} />}
                  {profile.acq_geo_pref && profile.acq_geo_pref.length > 0 && <StatBox label="Target region" value={profile.acq_geo_pref.join(', ')} />}
                </>
              )}
            </div>
          </div>

          {/* Card body */}
          <div style={{ padding: '2rem' }}>
            {profile.bio && (
              <>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  About
                </div>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: BRAND.midnight, lineHeight: 1.7, marginBottom: '1.5rem' }}>
                  {profile.bio}
                </p>
              </>
            )}

            {profile.specialties?.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Specialties
                </div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: BRAND.midnight }}>
                  {profile.specialties.join(', ')}
                </div>
              </div>
            )}

            {profile.carrier_affiliations?.length > 0 && (
              <div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Carrier affiliations
                </div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: BRAND.midnight }}>
                  {profile.carrier_affiliations.join(', ')}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column', padding: '8px 12px', borderRadius: '8px',
      background: highlight ? '#FEF9EC' : '#F9FAFB',
      border: highlight ? `1px solid ${BRAND.voltage}` : '1px solid #F3F4F6',
    }}>
      {label && <span style={{ fontSize: '10px', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif', letterSpacing: '.06em', textTransform: 'uppercase' }}>{label}</span>}
      <span style={{ fontSize: '13px', fontWeight: 500, color: BRAND.midnight, fontFamily: 'DM Sans, sans-serif' }}>{value}</span>
    </div>
  )
}