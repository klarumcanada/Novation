'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import NovationNav from '@/components/NovationNav'

const BRAND = {
  midnight: '#0D1B3E',
  navy: '#1A3266',
  electric: '#3B82F6',
  ice: '#DBEAFE',
  chalk: '#F8F7F4',
  voltage: '#E8C547',
}

type Advisor = {
  id: string
  full_name: string
  province: string
  years_in_practice: number
  intent: string
  aum: number | null
  book_value: number | null
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

function formatMoney(value: number) {
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

export default function AdvisorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [advisor, setAdvisor] = useState<Advisor | null>(null)
  const [myIntent, setMyIntent] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [messageSent, setMessageSent] = useState(false)

  useEffect(() => {
    async function load() {
      const [detailRes, savesRes] = await Promise.all([
        fetch(`/api/marketplace/${id}`),
        fetch('/api/saves'),
      ])
      const detailData = await detailRes.json()
      const savesData = await savesRes.json()
      setAdvisor(detailData.advisor ?? null)
      setMyIntent(detailData.myIntent ?? null)
      setSaved((savesData.saved ?? []).includes(id))
      setLoading(false)
    }
    load()
  }, [id])

  async function toggleSave() {
    const method = saved ? 'DELETE' : 'POST'
    await fetch('/api/saves', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ advisorId: id }),
    })
    setSaved(!saved)
  }

  function handleMessage() {
    setMessageSent(true)
    setTimeout(() => setMessageSent(false), 3000)
  }

  if (loading) {
    return (
      <div style={{ background: BRAND.chalk, minHeight: '100vh' }}>
        <NovationNav />
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 1.5rem', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF' }}>
          Loading…
        </div>
      </div>
    )
  }

  if (!advisor) {
    return (
      <div style={{ background: BRAND.chalk, minHeight: '100vh' }}>
        <NovationNav />
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 1.5rem', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF' }}>
          Advisor not found.
        </div>
      </div>
    )
  }

  const isSeller = advisor.intent === 'selling'
  const accentColor = isSeller ? BRAND.voltage : BRAND.electric

  return (
    <div style={{ background: BRAND.chalk, minHeight: '100vh' }}>
      <NovationNav />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>

        {/* Back */}
        <button
          onClick={() => router.push('/marketplace')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#9CA3AF', marginBottom: '1.5rem', padding: 0, display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          ← Back to marketplace
        </button>

        {/* Header card */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '2rem', marginBottom: '1.5rem' }}>
          <div style={{ borderLeft: `4px solid ${accentColor}`, paddingLeft: '16px', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                {/* Avatar */}
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: BRAND.ice, color: BRAND.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', flexShrink: 0, overflow: 'hidden' }}>
                  {advisor.avatar_url
                    ? <img src={advisor.avatar_url} alt={advisor.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    : getInitials(advisor.full_name)
                  }
                </div>
                <div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: 700, color: BRAND.midnight, marginBottom: '4px' }}>{advisor.full_name}</div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B7280' }}>
                    {advisor.province} · {advisor.years_in_practice} years in practice
                  </div>
                </div>
              </div>
              <span style={{
                padding: '4px 12px', fontSize: '11px', fontFamily: 'DM Sans, sans-serif', borderRadius: '20px', fontWeight: 500, whiteSpace: 'nowrap',
                background: isSeller ? '#FEF9EC' : BRAND.ice,
                color: isSeller ? '#92400E' : BRAND.navy,
                border: `1px solid ${accentColor}`,
              }}>
                {isSeller ? 'Seller' : 'Buyer'}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: advisor.bio ? '1.5rem' : 0 }}>
            {isSeller ? (
              <>
                {advisor.book_value && <StatBlock label="Book Value" value={formatMoney(advisor.book_value)} highlight />}
                {!advisor.book_value && advisor.aum && <StatBlock label="AUM" value={formatMoney(advisor.aum)} />}
                {advisor.client_count && <StatBlock label="Clients" value={advisor.client_count.toLocaleString()} />}
                {advisor.transition_duration && <StatBlock label="Transition Timeline" value={advisor.transition_duration} />}
                {advisor.willing_to_stay && <StatBlock label="" value="Open to staying on" />}
              </>
            ) : (
              <>
                {advisor.acquisition_budget && <StatBlock label="Budget" value={formatMoney(advisor.acquisition_budget)} />}
                {advisor.acquisition_timeline && <StatBlock label="Acquisition Timeline" value={advisor.acquisition_timeline} />}
                {advisor.target_provinces?.length && <StatBlock label="Target Region" value={advisor.target_provinces.join(', ')} />}
              </>
            )}
          </div>

          {/* Bio */}
          {advisor.bio && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #F3F4F6' }}>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '8px' }}>About</div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: BRAND.midnight, lineHeight: 1.7, margin: 0 }}>{advisor.bio}</p>
            </div>
          )}
        </div>

        {/* Details card */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '2rem', marginBottom: '1.5rem' }}>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>Details</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {advisor.specialties?.length > 0 && (
              <DetailRow label="Specialties" value={advisor.specialties.join(', ')} />
            )}
            {advisor.carrier_affiliations?.length > 0 && (
              <DetailRow label="Carriers" value={advisor.carrier_affiliations.join(', ')} />
            )}
            {isSeller && advisor.target_provinces?.length && (
              <DetailRow label="Target Provinces" value={advisor.target_provinces.join(', ')} />
            )}
            {isSeller && advisor.target_cities?.length && (
              <DetailRow label="Target Cities" value={advisor.target_cities.join(', ')} />
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={toggleSave}
            style={{
              padding: '10px 20px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
              borderRadius: '8px', cursor: 'pointer', transition: 'all .15s',
              background: saved ? BRAND.ice : 'white',
              color: saved ? BRAND.navy : BRAND.midnight,
              border: saved ? `1.5px solid ${BRAND.electric}` : '1.5px solid #E5E7EB',
            }}
          >
            {saved ? '✓ Saved' : 'Save profile'}
          </button>

          <button
            onClick={handleMessage}
            style={{
              padding: '10px 24px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
              borderRadius: '8px', cursor: 'pointer', transition: 'all .15s',
              background: messageSent ? '#D1FAE5' : BRAND.midnight,
              color: messageSent ? '#065F46' : 'white',
              border: 'none',
            }}
          >
            {messageSent ? '✓ Coming soon' : 'Send message'}
          </button>
        </div>

      </div>
    </div>
  )
}

function StatBlock({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column', padding: '10px 14px', borderRadius: '10px',
      background: highlight ? '#FEF9EC' : '#F9FAFB',
      border: highlight ? `1px solid ${BRAND.voltage}` : '1px solid #F3F4F6',
    }}>
      {label && <span style={{ fontSize: '10px', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '3px' }}>{label}</span>}
      <span style={{ fontSize: '15px', fontWeight: 600, color: BRAND.midnight, fontFamily: 'DM Sans, sans-serif' }}>{value}</span>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600, color: '#9CA3AF', width: '140px', flexShrink: 0, paddingTop: '1px' }}>{label}</span>
      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: BRAND.midnight, lineHeight: 1.6 }}>{value}</span>
    </div>
  )
}