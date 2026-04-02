'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import NovationNav from '@/components/NovationNav'

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
  id: string
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
  return `$${value}${unit === 'thousands' ? 'K' : 'M'}`
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

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [advisor, setAdvisor] = useState<Advisor | null>(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)

  // Message form
  const [showForm, setShowForm] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [msgError, setMsgError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('advisors')
        .select('*')
        .eq('id', id)
        .single()
      if (data) setAdvisor(data)

      // Check if saved
      const res = await fetch('/api/saves')
      const saveData = await res.json()
      setSaved(saveData.saved?.includes(id) ?? false)

      setLoading(false)
    }
    load()
  }, [id, supabase])

  async function toggleSave() {
    setSaveLoading(true)
    const res = await fetch('/api/saves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ advisor_id: id }),
    })
    const data = await res.json()
    setSaved(data.saved)
    setSaveLoading(false)
  }

  async function handleSendMessage() {
    if (!body.trim()) return setMsgError('Please enter a message.')
    setMsgError(null)
    setSending(true)
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_id: id, subject, body }),
    })
    setSending(false)
    if (!res.ok) {
      const data = await res.json()
      setMsgError(data.error ?? 'Failed to send.')
      return
    }
    setSent(true)
    setShowForm(false)
    setBody('')
    setSubject('')
  }

  if (loading) return (
    <div style={{ background: BRAND.chalk, minHeight: '100vh' }}>
      <NovationNav />
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF' }}>Loading…</p>
      </div>
    </div>
  )

  if (!advisor) return (
    <div style={{ background: BRAND.chalk, minHeight: '100vh' }}>
      <NovationNav />
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF' }}>Advisor not found.</p>
      </div>
    </div>
  )

  const isSeller = advisor.intent === 'selling'

  return (
    <div style={{ background: BRAND.chalk, minHeight: '100vh', paddingBottom: '4rem' }}>
      <NovationNav />

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>

        {/* Back */}
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif', marginBottom: '1.5rem', padding: 0 }}
        >
          ← Back to marketplace
        </button>

        {/* Action row */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
          <button
            onClick={toggleSave}
            disabled={saveLoading}
            style={{
              padding: '10px 20px', fontSize: '13px', fontWeight: 500,
              fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', cursor: 'pointer',
              border: saved ? `1.5px solid ${BRAND.voltage}` : '1.5px solid #E5E7EB',
              background: saved ? '#FEF9EC' : 'white',
              color: saved ? '#92400E' : BRAND.midnight,
              transition: 'all .15s',
            }}
          >
            {saved ? '★ Saved' : '☆ Save profile'}
          </button>
          <button
            onClick={() => { setShowForm(f => !f); setSent(false) }}
            style={{
              padding: '10px 20px', fontSize: '13px', fontWeight: 500,
              fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', cursor: 'pointer',
              border: 'none', background: BRAND.midnight, color: 'white',
              transition: 'all .15s',
            }}
          >
            Send message
          </button>
          {sent && (
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: BRAND.electric, alignSelf: 'center' }}>
              Message sent ✓
            </span>
          )}
        </div>

        {/* Message form */}
        {showForm && (
          <div style={{
            background: 'white', borderRadius: '12px', border: '1px solid #E5E7EB',
            padding: '1.5rem', marginBottom: '1.5rem',
          }}>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: BRAND.midnight, marginBottom: '1rem' }}>
              Message {advisor.full_name}
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6B7280', fontFamily: 'DM Sans, sans-serif', marginBottom: '6px' }}>
                Subject (optional)
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Interested in your book"
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6B7280', fontFamily: 'DM Sans, sans-serif', marginBottom: '6px' }}>
                Message *
              </label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={4}
                placeholder="Introduce yourself and explain your interest..."
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
              />
            </div>
            {msgError && <div style={{ fontSize: '13px', color: '#DC2626', fontFamily: 'DM Sans, sans-serif', marginBottom: '1rem' }}>{msgError}</div>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleSendMessage}
                disabled={sending}
                style={{
                  padding: '10px 20px', fontSize: '13px', fontWeight: 500,
                  fontFamily: 'DM Sans, sans-serif', borderRadius: '8px',
                  border: 'none', background: BRAND.midnight,
                  color: 'white', cursor: sending ? 'not-allowed' : 'pointer',
                }}
              >
                {sending ? 'Sending…' : 'Send →'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  padding: '10px 20px', fontSize: '13px',
                  fontFamily: 'DM Sans, sans-serif', borderRadius: '8px',
                  border: '1.5px solid #E5E7EB', background: 'white',
                  color: '#6B7280', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Profile card */}
        <div style={{
          background: 'white', borderRadius: '16px', border: '1px solid #E5E7EB',
          overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,.06)',
        }}>
          {/* Header */}
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
                  {advisor.avatar_url
                    ? <img src={advisor.avatar_url} alt={advisor.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : getInitials(advisor.full_name)
                  }
                </div>
                <div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: 400, color: BRAND.midnight }}>
                    {advisor.full_name}
                  </div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#9CA3AF', marginTop: '3px' }}>
                    {advisor.province} · {advisor.years_in_practice} years in practice
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
                  {advisor.aum_value && <StatBox label="AUM" value={formatAUM(advisor.aum_value, advisor.aum_unit)} />}
                  {advisor.client_count && <StatBox label="Clients" value={advisor.client_count.toLocaleString()} />}
                  {advisor.transition_duration && <StatBox label="Timeline" value={TIMELINE_LABELS[advisor.transition_duration] ?? advisor.transition_duration} />}
                  {advisor.stay_on_postsale && <StatBox label="" value="Open to staying on" highlight />}
                  {advisor.buyer_geo_pref && advisor.buyer_geo_pref.length > 0 && <StatBox label="Target region" value={advisor.buyer_geo_pref.join(', ')} />}
                </>
              ) : (
                <>
                  {advisor.acq_budget_value && <StatBox label="Budget" value={formatAUM(advisor.acq_budget_value, advisor.acq_budget_unit)} />}
                  {advisor.acq_timeline && <StatBox label="Timeline" value={ACQ_TIMELINE_LABELS[advisor.acq_timeline] ?? advisor.acq_timeline} />}
                  {advisor.acq_geo_pref && advisor.acq_geo_pref.length > 0 && <StatBox label="Target region" value={advisor.acq_geo_pref.join(', ')} />}
                </>
              )}
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '2rem' }}>
            {advisor.bio && (
              <>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  About
                </div>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: BRAND.midnight, lineHeight: 1.7, marginBottom: '1.5rem' }}>
                  {advisor.bio}
                </p>
              </>
            )}

            {advisor.specialties?.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Specialties
                </div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: BRAND.midnight }}>
                  {advisor.specialties.join(', ')}
                </div>
              </div>
            )}

            {advisor.carrier_affiliations?.length > 0 && (
              <div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Carrier affiliations
                </div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: BRAND.midnight }}>
                  {advisor.carrier_affiliations.join(', ')}
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

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', fontSize: '14px',
  fontFamily: 'DM Sans, sans-serif', borderRadius: '8px',
  border: '1.5px solid #E5E7EB', background: 'white',
  color: BRAND.midnight, outline: 'none', boxSizing: 'border-box',
}