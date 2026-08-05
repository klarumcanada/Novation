'use client'

import Link from 'next/link'

const BRAND = {
  midnight: '#0D1B3E',
  navy: '#1A3266',
  electric: '#3B82F6',
  ice: '#DBEAFE',
  chalk: '#F8F7F4',
  voltage: '#E8C547',
}

export type ProfileData = {
  profile: {
    id: string
    account_type: 'individual' | 'corporation'
    role: 'buyer' | 'seller'
    name: string
    city: string | null
    province: string
    avatar_url: string | null
    bio: string | null
  }
  details: {
    entity_name?: string | null
    years_in_business?: number | null
    aum_cad?: number | null
    aggregate_aum_cad?: number | null
    client_count?: number | null
    exit_timeline?: string | null
    sale_portion_type?: string | null
    valuation_method?: string | null
    acquisition_budget_cad?: number | null
    acquisition_timeline?: string | null
    target_provinces?: string[] | null
    products?: string[] | null
    carrier_affiliations?: string[] | null
  }
  valuation: {
    low_value: number
    high_value: number
    calculated_at: string
  } | null
  myRole: 'buyer' | 'seller'
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

function StatPill({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column', padding: '8px 12px', borderRadius: '8px',
      background: highlight ? '#FEF9EC' : '#F9FAFB',
      border: highlight ? `1px solid ${BRAND.voltage}` : '1px solid #F0F1F4',
    }}>
      {label && <span style={{ fontSize: '10px', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif', letterSpacing: '.06em', textTransform: 'uppercase' }}>{label}</span>}
      <span style={{ fontSize: '13px', fontWeight: 500, color: BRAND.midnight, fontFamily: 'DM Sans, sans-serif' }}>{value}</span>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
        {label}
      </div>
      {children}
    </div>
  )
}

export function AgoraProfileView({ data, isSelf }: { data: ProfileData; isSelf: boolean }) {
  const { profile, details, valuation } = data
  const isSeller = profile.role === 'seller'
  const bookValue = details.aum_cad ?? details.aggregate_aum_cad ?? null

  const location = [profile.city, profile.province].filter(Boolean).join(', ')

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2.5rem 1.5rem', paddingBottom: '4rem' }}>

      {/* Preview banner */}
      {isSelf && (
        <div style={{
          background: BRAND.voltage + '22', border: `1px solid ${BRAND.voltage}`,
          borderRadius: '10px', padding: '12px 16px', marginBottom: '2rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: BRAND.midnight, fontWeight: 500 }}>
            This is how your listing appears to others in the marketplace.
          </span>
          <Link href="/agora/profile/edit" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: BRAND.electric, textDecoration: 'none', whiteSpace: 'nowrap', marginLeft: '1rem' }}>
            Edit profile →
          </Link>
        </div>
      )}

      {/* Card */}
      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E6F0', overflow: 'hidden' }}>

        {/* Card header */}
        <div style={{ padding: '2rem', borderBottom: '1px solid #F3F4F6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>

              {/* Avatar */}
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                background: BRAND.ice, color: BRAND.navy, border: '2px solid #E2E6F0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
              }}>
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : getInitials(profile.name)
                }
              </div>

              {/* Name + meta */}
              <div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 600, color: BRAND.midnight, lineHeight: 1.2 }}>
                  {profile.name}
                </div>
                {profile.account_type === 'corporation' && details.entity_name && (
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: BRAND.navy, marginTop: '2px' }}>
                    {details.entity_name}
                  </div>
                )}
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#9CA3AF', marginTop: '3px' }}>
                  {[location, details.years_in_business ? `${details.years_in_business} yrs in business` : null].filter(Boolean).join(' · ')}
                </div>
              </div>
            </div>

            {/* Role badge */}
            <span style={{
              padding: '5px 12px', fontSize: '11px', fontWeight: 500,
              fontFamily: 'DM Sans, sans-serif', borderRadius: '20px', whiteSpace: 'nowrap',
              background: isSeller ? '#FEF9EC' : BRAND.ice,
              color: isSeller ? '#92400E' : BRAND.navy,
              border: `1px solid ${isSeller ? BRAND.voltage : BRAND.electric}`,
            }}>
              {isSeller ? 'Selling' : 'Acquiring'}
            </span>
          </div>

          {/* Stat pills */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {isSeller ? (
              <>
                {bookValue !== null && <StatPill label="Book value" value={formatMoney(bookValue)} highlight />}
                {details.client_count != null && <StatPill label="Clients" value={details.client_count.toLocaleString()} />}
                {details.exit_timeline && <StatPill label="Exit timeline" value={details.exit_timeline} />}
                {details.sale_portion_type === 'partial' && <StatPill label="" value="Partial sale" />}
              </>
            ) : (
              <>
                {details.acquisition_budget_cad != null && <StatPill label="Budget" value={formatMoney(details.acquisition_budget_cad)} highlight />}
                {details.acquisition_timeline && <StatPill label="Timeline" value={details.acquisition_timeline} />}
                {(details.target_provinces?.length ?? 0) > 0 && (
                  <StatPill label="Target region" value={details.target_provinces!.join(', ')} />
                )}
              </>
            )}
          </div>

          {/* Valuation range */}
          {valuation && (
            <div style={{
              marginTop: '1rem', padding: '12px 14px', borderRadius: '10px',
              background: '#FFFBEB', border: `1px solid ${BRAND.voltage}55`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#92400E', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                  Estimated value range
                </span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 600, color: BRAND.midnight }}>
                  {formatMoney(valuation.low_value)} – {formatMoney(valuation.high_value)}
                </span>
              </div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#92400E', opacity: 0.75, margin: 0 }}>
                Self-reported estimate. Not verified by Klarum or any third party.
              </p>
            </div>
          )}
        </div>

        {/* Card body */}
        <div style={{ padding: '2rem' }}>
          {profile.bio && (
            <Section label="About">
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: BRAND.midnight, lineHeight: 1.7, margin: 0 }}>
                {profile.bio}
              </p>
            </Section>
          )}

          {(details.products?.length ?? 0) > 0 && (
            <Section label="Products">
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: BRAND.midnight, margin: 0 }}>
                {details.products!.join(', ')}
              </p>
            </Section>
          )}

          {(details.carrier_affiliations?.length ?? 0) > 0 && (
            <Section label="Carrier affiliations">
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: BRAND.midnight, margin: 0 }}>
                {details.carrier_affiliations!.join(', ')}
              </p>
            </Section>
          )}

          {!isSelf && (
            <div style={{ marginTop: '0.5rem', paddingTop: '1.25rem', borderTop: '1px solid #F3F4F6' }}>
              <Link href={`/agora/inbox/new?to=${profile.id}`} style={{
                display: 'inline-block', padding: '10px 20px',
                background: BRAND.midnight, color: 'white', borderRadius: '8px',
                fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500,
                textDecoration: 'none',
              }}>
                Send a message
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
