'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
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

function fmt(n: number) {
  return '$' + n.toLocaleString('en-CA', { maximumFractionDigits: 0 })
}

function getInitials(name: string) {
  const parts = name?.trim().split(' ') ?? []
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  if (parts.length === 1 && parts[0]) return parts[0][0].toUpperCase()
  return '?'
}

export default function AgoraProfileEditPage() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [accountType, setAccountType] = useState<'individual' | 'corporation' | null>(null)
  const [role, setRole] = useState<'buyer' | 'seller' | null>(null)
  const [currentValuation, setCurrentValuation] = useState<{ low_value: number; high_value: number; calculated_at: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Basic info
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [entityName, setEntityName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [bio, setBio] = useState('')

  // Shared detail fields
  const [products, setProducts] = useState<string[]>([])
  const [carriers, setCarriers] = useState<string[]>([])

  // Seller fields
  const [bookValue, setBookValue] = useState('')
  const [clientCount, setClientCount] = useState('')
  const [exitTimeline, setExitTimeline] = useState('')
  const [salePortionType, setSalePortionType] = useState<'full' | 'partial' | ''>('')

  // Buyer fields
  const [acquisitionBudget, setAcquisitionBudget] = useState('')
  const [acquisitionTimeline, setAcquisitionTimeline] = useState('')
  const [targetProvinces, setTargetProvinces] = useState<string[]>([])

  const avatarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const [res, { data: { user } }] = await Promise.all([
        fetch('/api/agora/profile'),
        supabase.auth.getUser(),
      ])
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }

      const { profile, details, valuation } = data
      setAccountType(profile.account_type)
      setRole(profile.role)
      setCurrentValuation(valuation ?? null)
      setEmail(user?.email ?? '')

      setName(profile.name ?? '')
      setEntityName(details.entity_name ?? '')
      setAvatarUrl(profile.avatar_url ?? null)
      setPhone(profile.phone ?? '')
      setCity(profile.city ?? '')
      setProvince(profile.province ?? '')
      setBio(profile.bio ?? '')

      setProducts(details.products ?? [])
      setCarriers(details.carrier_affiliations ?? [])

      if (profile.role === 'seller') {
        const bv = details.aum_cad ?? details.aggregate_aum_cad
        setBookValue(bv != null ? String(bv) : '')
        setClientCount(details.client_count != null ? String(details.client_count) : '')
        setExitTimeline(details.exit_timeline ?? '')
        setSalePortionType(details.sale_portion_type ?? '')
      } else {
        setAcquisitionBudget(details.acquisition_budget_cad != null ? String(details.acquisition_budget_cad) : '')
        setAcquisitionTimeline(details.acquisition_timeline ?? '')
        setTargetProvinces(details.target_provinces ?? [])
      }

      setLoading(false)
    }
    load()
  }, [])

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploading(false); return }
    const ext = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage.from('agora-uploads').upload(path, file, { upsert: true })
    if (uploadError) { setError(`Upload failed: ${uploadError.message}`); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('agora-uploads').getPublicUrl(path)
    setAvatarUrl(`${publicUrl}?t=${Date.now()}`)
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const payload: Record<string, unknown> = {
      name, city, province, bio,
      avatar_url: avatarUrl,
      phone,
      products,
      carrier_affiliations: carriers,
    }

    if (accountType === 'corporation') payload.entity_name = entityName

    if (role === 'seller') {
      payload.book_value   = bookValue ? Number(bookValue) : null
      payload.client_count = clientCount ? Number(clientCount) : null
      payload.exit_timeline    = exitTimeline || null
      payload.sale_portion_type = salePortionType || null
    } else {
      payload.acquisition_budget_cad  = acquisitionBudget ? Number(acquisitionBudget) : null
      payload.acquisition_timeline    = acquisitionTimeline || null
      payload.target_provinces        = targetProvinces.length ? targetProvinces : null
    }

    const res = await fetch('/api/agora/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()

    if (data.error) {
      setError(data.error)
      setSubmitting(false)
      return
    }

    setSaved(true)
    setTimeout(() => router.push('/agora/profile'), 1200)
  }

  function toggleItem(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value])
  }

  if (loading) return (
    <div style={{ background: BRAND.chalk, minHeight: '100vh' }}>
      <AgoraNav />
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <p style={mutedText}>Loading…</p>
      </div>
    </div>
  )

  return (
    <div style={{ background: BRAND.chalk, minHeight: '100vh', paddingBottom: '4rem' }}>
      <AgoraNav />

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '26px', fontWeight: 600, color: BRAND.midnight, marginBottom: '4px' }}>
            Edit profile
          </h1>
          <Link href="/agora/profile" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: BRAND.electric, textDecoration: 'none' }}>
            ← Back to profile
          </Link>
        </div>

        <form onSubmit={handleSubmit}>

          {/* ── BASIC INFO ─────────────────────────────────────────── */}
          <SectionCard label="Basic info">

            {/* Avatar */}
            <Field label="Profile photo">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                  background: BRAND.ice, border: '2px solid #E2E6F0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', color: BRAND.navy,
                }}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (name ? getInitials(name) : '+')
                  }
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploading}
                    style={{ padding: '8px 16px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', border: `1.5px solid ${BRAND.electric}`, background: BRAND.ice, color: BRAND.navy, cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}
                  >
                    {uploading ? 'Uploading…' : avatarUrl ? 'Change photo' : 'Upload photo'}
                  </button>
                  <p style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif', marginTop: '4px', marginBottom: 0 }}>
                    JPG or PNG, max 5MB
                  </p>
                </div>
                <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png" onChange={handleAvatarUpload} style={{ display: 'none' }} />
              </div>
            </Field>

            {/* Name */}
            <Field label={accountType === 'corporation' ? 'Contact name' : 'Full name'} required>
              <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="Your name" required />
            </Field>

            {/* Entity name — corporations only */}
            {accountType === 'corporation' && (
              <Field label="Entity name">
                <input value={entityName} onChange={e => setEntityName(e.target.value)} style={inputStyle} placeholder="Your company or practice name" />
              </Field>
            )}

            {/* Email */}
            <Field label="Email">
              <input value={email} readOnly style={{ ...inputStyle, background: '#F9FAFB', color: '#9CA3AF', cursor: 'not-allowed' }} />
            </Field>

            {/* Phone */}
            <Field label="Phone">
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="10-digit number"
                style={inputStyle}
              />
            </Field>

            {/* City */}
            <Field label="City">
              <input value={city} onChange={e => setCity(e.target.value)} style={inputStyle} placeholder="e.g. Toronto" />
            </Field>

            {/* Province */}
            <Field label="Province">
              <select value={province} onChange={e => setProvince(e.target.value)} style={selectStyle}>
                <option value="">Select province</option>
                {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>

            {/* Bio */}
            <Field label={`Bio${bio.length > 0 ? ` — ${bio.length}/500` : ''}`}>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                maxLength={500}
                rows={4}
                placeholder="A short description of your practice and approach…"
                style={textareaStyle}
              />
            </Field>

          </SectionCard>

          {/* ── ROLE-SPECIFIC DETAILS ──────────────────────────────── */}
          <SectionCard label={role === 'seller' ? 'Selling details' : 'Acquisition details'}>

            {role === 'seller' && (
              <>
                {/* Book value */}
                <Field label="Book value (AUM)">
                  {currentValuation && (
                    <div style={{
                      marginBottom: '10px', padding: '10px 14px', borderRadius: '8px',
                      background: '#FFFBEB', border: `1px solid ${BRAND.voltage}55`,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#92400E' }}>
                        Calculator estimate: {fmt(currentValuation.low_value)} – {fmt(currentValuation.high_value)}
                      </span>
                      <Link href="/agora/register?step=valuation" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: BRAND.electric, textDecoration: 'none', whiteSpace: 'nowrap', marginLeft: '12px' }}>
                        Recalculate →
                      </Link>
                    </div>
                  )}
                  <div style={{ position: 'relative' }}>
                    <span style={currencyPrefix}>$</span>
                    <input
                      type="number"
                      value={bookValue}
                      onChange={e => setBookValue(e.target.value)}
                      placeholder="e.g. 1500000"
                      style={{ ...inputStyle, paddingLeft: '28px' }}
                    />
                  </div>
                </Field>

                {/* Client count */}
                <Field label="Number of clients">
                  <input
                    type="number"
                    value={clientCount}
                    onChange={e => setClientCount(e.target.value)}
                    placeholder="e.g. 150"
                    style={inputStyle}
                  />
                </Field>

                {/* Exit timeline */}
                <Field label="Exit timeline">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {EXIT_TIMELINES.map(t => (
                      <ToggleChip key={t} label={t} active={exitTimeline === t}
                        onClick={() => setExitTimeline(exitTimeline === t ? '' : t)} />
                    ))}
                  </div>
                </Field>

                {/* Portion of book */}
                <Field label="Portion of book">
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <ToggleChip label="Full book" active={salePortionType === 'full'}
                      onClick={() => setSalePortionType(salePortionType === 'full' ? '' : 'full')} />
                    <ToggleChip label="Partial sale" active={salePortionType === 'partial'}
                      onClick={() => setSalePortionType(salePortionType === 'partial' ? '' : 'partial')} />
                  </div>
                </Field>
              </>
            )}

            {role === 'buyer' && (
              <>
                {/* Acquisition budget */}
                <Field label="Acquisition budget">
                  <div style={{ position: 'relative' }}>
                    <span style={currencyPrefix}>$</span>
                    <input
                      type="number"
                      value={acquisitionBudget}
                      onChange={e => setAcquisitionBudget(e.target.value)}
                      placeholder="e.g. 1000000"
                      style={{ ...inputStyle, paddingLeft: '28px' }}
                    />
                  </div>
                </Field>

                {/* Acquisition timeline */}
                <Field label="Acquisition timeline">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {ACQ_TIMELINES.map(t => (
                      <ToggleChip key={t} label={t} active={acquisitionTimeline === t}
                        onClick={() => setAcquisitionTimeline(acquisitionTimeline === t ? '' : t)} />
                    ))}
                  </div>
                </Field>

                {/* Target geography */}
                <Field label="Target provinces">
                  <MultiSelect
                    options={PROVINCES}
                    selected={targetProvinces}
                    onToggle={v => toggleItem(targetProvinces, setTargetProvinces, v)}
                    placeholder="Select provinces"
                  />
                </Field>
              </>
            )}

            {/* Products — both roles */}
            <Field label="Products">
              <MultiSelect
                options={PRODUCTS}
                selected={products}
                onToggle={v => toggleItem(products, setProducts, v)}
                placeholder="Select products"
              />
            </Field>

            {/* Carriers */}
            <Field label="Carrier affiliations">
              <MultiSelect
                options={CARRIERS}
                selected={carriers}
                onToggle={v => toggleItem(carriers, setCarriers, v)}
                placeholder="Select carriers"
              />
            </Field>

          </SectionCard>

          {/* ── Submit ─────────────────────────────────────────────── */}
          {error && (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#DC2626', marginBottom: '1rem' }}>
              {error}
            </p>
          )}
          {saved && (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#16A34A', marginBottom: '1rem' }}>
              Profile saved. Redirecting…
            </p>
          )}
          <button
            type="submit"
            disabled={submitting || saved}
            style={{
              width: '100%', padding: '14px', fontSize: '14px', fontWeight: 500,
              fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', border: 'none',
              background: (submitting || saved) ? '#d1d5db' : BRAND.electric,
              color: (submitting || saved) ? '#9ca3af' : 'white',
              cursor: (submitting || saved) ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Saving…' : 'Save profile'}
          </button>

        </form>
      </div>
    </div>
  )
}

// ── Section card ──────────────────────────────────────────────────

function SectionCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'white', borderRadius: '12px', border: '1px solid #E2E6F0',
      padding: '1.75rem', marginBottom: '1.5rem',
    }}>
      <div style={{
        fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600,
        color: '#9CA3AF', letterSpacing: '.1em', textTransform: 'uppercase',
        marginBottom: '1.5rem',
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

// ── Field ─────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      {label && (
        <label style={{
          display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
          fontWeight: 500, color: BRAND.midnight, marginBottom: '8px',
        }}>
          {label}
          {required && <span style={{ color: '#DC2626', marginLeft: '3px' }}>*</span>}
        </label>
      )}
      {children}
    </div>
  )
}

// ── ToggleChip ────────────────────────────────────────────────────

function ToggleChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: '8px 14px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', borderRadius: '8px',
      border: active ? `2px solid ${BRAND.electric}` : '1.5px solid #d1d5db',
      background: active ? BRAND.ice : 'white',
      color: active ? BRAND.navy : '#6b7280',
      cursor: 'pointer', fontWeight: active ? 500 : 400,
    }}>
      {label}
    </button>
  )
}

// ── MultiSelect ───────────────────────────────────────────────────

function MultiSelect({ options, selected, onToggle, placeholder }: {
  options: string[]; selected: string[]; onToggle: (v: string) => void; placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const label = selected.length === 0 ? placeholder : selected.length === 1 ? selected[0] : `${selected.length} selected`

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        width: '100%', padding: '11px 14px', fontSize: '14px',
        fontFamily: 'DM Sans, sans-serif',
        borderRadius: open ? '8px 8px 0 0' : '8px',
        border: open ? `1.5px solid ${BRAND.electric}` : '1.5px solid #d1d5db',
        background: 'white', cursor: 'pointer',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ color: selected.length === 0 ? '#9ca3af' : BRAND.midnight }}>{label}</span>
        <span style={{ fontSize: '10px', color: BRAND.navy, opacity: 0.5 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: 'white', border: `1.5px solid ${BRAND.electric}`, borderTop: 'none',
          borderRadius: '0 0 8px 8px', zIndex: 50, maxHeight: '220px', overflowY: 'auto',
          boxShadow: '0 4px 12px rgba(0,0,0,.06)',
        }}>
          {options.map(opt => {
            const active = selected.includes(opt)
            return (
              <button key={opt} type="button" onClick={() => onToggle(opt)} style={{
                width: '100%', padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: '10px',
                background: active ? '#f0f6ff' : 'white',
                border: 'none', borderBottom: '1px solid #f3f4f6',
                cursor: 'pointer', textAlign: 'left',
              }}>
                <span style={{
                  width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
                  border: active ? `2px solid ${BRAND.electric}` : '1.5px solid #d1d5db',
                  background: active ? BRAND.electric : 'white',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {active && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span style={{ fontSize: '14px', color: BRAND.midnight, fontFamily: 'DM Sans, sans-serif' }}>{opt}</span>
              </button>
            )
          })}
        </div>
      )}
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
          {selected.map(s => (
            <span key={s} style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '4px 10px', fontSize: '12px', fontFamily: 'DM Sans, sans-serif',
              borderRadius: '20px', background: BRAND.ice, color: BRAND.navy,
              border: `1px solid ${BRAND.electric}`, fontWeight: 500,
            }}>
              {s}
              <button type="button" onClick={() => onToggle(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 6px', color: BRAND.electric, fontSize: '14px', lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 12px', fontSize: '14px',
  fontFamily: 'DM Sans, sans-serif', borderRadius: '8px',
  border: '1.5px solid #d1d5db', background: 'white',
  color: BRAND.midnight, outline: 'none', boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '11px 12px', fontSize: '14px',
  fontFamily: 'DM Sans, sans-serif', borderRadius: '8px',
  border: '1.5px solid #d1d5db', background: 'white',
  color: BRAND.midnight, outline: 'none',
}

const textareaStyle: React.CSSProperties = {
  width: '100%', padding: '12px', fontSize: '14px',
  fontFamily: 'DM Sans, sans-serif', borderRadius: '8px',
  border: '1.5px solid #d1d5db', background: 'white',
  color: BRAND.midnight, resize: 'vertical', lineHeight: '1.6',
  outline: 'none', boxSizing: 'border-box',
}

const currencyPrefix: React.CSSProperties = {
  position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
  fontSize: '14px', color: '#9ca3af', fontFamily: 'DM Sans, sans-serif', pointerEvents: 'none',
}

const mutedText: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF',
}
