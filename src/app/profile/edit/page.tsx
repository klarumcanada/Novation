'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { SPECIALTIES, CARRIERS, PROVINCES } from '@/lib/validations'

type Intent = 'selling' | 'buying' | 'open'

const BRAND = {
  midnight: '#0D1B3E',
  navy: '#1A3266',
  electric: '#3B82F6',
  ice: '#DBEAFE',
  chalk: '#F8F7F4',
  voltage: '#E8C547',
}

const PROVINCE_NAMES: Record<string, string> = {
  AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba', NB: 'New Brunswick',
  NL: 'Newfoundland', NS: 'Nova Scotia', NT: 'Northwest Territories', NU: 'Nunavut',
  ON: 'Ontario', PE: 'PEI', QC: 'Quebec', SK: 'Saskatchewan', YT: 'Yukon',
}

interface ProfileData {
  intent: Intent | null
  specialties: string[]
  carrier_affiliations: string[]
  bio: string
  aum_value: string
  aum_unit: 'thousands' | 'millions'
  client_count: string
  transition_duration: string
  stay_on_postsale: boolean | null
  buyer_geo_pref: string[]
  acq_budget_value: string
  acq_budget_unit: 'thousands' | 'millions'
  acq_geo_pref: string[]
  financing_status: string
  acq_timeline: string
  avatar_url: string
}

const empty: ProfileData = {
  intent: null,
  specialties: [],
  carrier_affiliations: [],
  bio: '',
  aum_value: '',
  aum_unit: 'millions',
  client_count: '',
  transition_duration: '',
  stay_on_postsale: null,
  buyer_geo_pref: [],
  acq_budget_value: '',
  acq_budget_unit: 'millions',
  acq_geo_pref: [],
  financing_status: '',
  acq_timeline: '',
  avatar_url: '',
}

function getInitials(name: string) {
  const parts = name?.trim().split(' ') ?? []
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return '?'
}

export default function ProfileEditPage() {
  const router = useRouter()
  const [form, setForm] = useState<ProfileData>(empty)
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => {
        if (data.error) return
        setFullName(data.full_name ?? '')
        setForm({
          intent: data.intent ?? null,
          specialties: data.specialties ?? [],
          carrier_affiliations: data.carrier_affiliations ?? [],
          bio: data.bio ?? '',
          aum_value: data.aum ? String(data.aum) : '',
          aum_unit: 'millions',
          client_count: data.client_count?.toString() ?? '',
          transition_duration: data.transition_duration ?? '',
          stay_on_postsale: data.willing_to_stay ?? null,
          buyer_geo_pref: data.target_provinces ?? [],
          acq_budget_value: data.acquisition_budget ? String(data.acquisition_budget) : '',
          acq_budget_unit: 'millions',
          acq_geo_pref: data.target_provinces ?? [],
          financing_status: data.financing_status ?? '',
          acq_timeline: data.acquisition_timeline ?? '',
          avatar_url: data.avatar_url ?? '',
        })
      })
      .finally(() => setLoading(false))
  }, [])

  function set<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function toggleMulti(
    key: 'specialties' | 'carrier_affiliations' | 'buyer_geo_pref' | 'acq_geo_pref',
    value: string
  ) {
    const list = form[key] as string[]
    set(key, list.includes(value) ? list.filter(v => v !== value) : [...list, value])
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const ext = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`

    const { data, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError(`Upload failed: ${uploadError.message}`)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(path)

    set('avatar_url', `${publicUrl}?t=${Date.now()}`)
    setUploading(false)
  }

  async function handleSubmit() {
    if (!form.intent) return setError('Please select your intent.')
    if (form.specialties.length === 0) return setError('Select at least one specialty.')
    if (form.carrier_affiliations.length === 0) return setError('Select at least one carrier.')
    setError(null)
    setSubmitting(true)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOnboarding: false, ...form }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.')
      setSubmitting(false)
      return
    }
setSubmitting(false)
router.push('/profile')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: BRAND.chalk, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: BRAND.navy, opacity: 0.5, fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>Loading…</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: BRAND.chalk, padding: '3rem 1.5rem' }}>
      <div style={{ maxWidth: '540px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '3rem' }}>
          <div>
            <div style={{ fontSize: '11px', letterSpacing: '.12em', textTransform: 'uppercase', color: BRAND.electric, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, marginBottom: '1rem' }}>
              Klarum Novation
            </div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: 400, color: BRAND.midnight, lineHeight: 1.2 }}>
              Edit profile
            </h1>
          </div>
          <button onClick={() => router.push('/profile')} style={ghostBtn}>
            ← Profile
          </button>
        </div>

        {/* Avatar upload */}
        <Field label="Profile photo">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: BRAND.ice, color: BRAND.navy,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
              flexShrink: 0, overflow: 'hidden',
              border: '2px solid #E5E7EB',
            }}>
              {form.avatar_url
                ? <img src={form.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : getInitials(fullName)
              }
            </div>
            <div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  padding: '8px 16px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
                  borderRadius: '8px', border: `1.5px solid ${BRAND.electric}`,
                  background: BRAND.ice, color: BRAND.navy, cursor: 'pointer',
                }}
              >
                {uploading ? 'Uploading…' : 'Upload photo'}
              </button>
              <p style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif', marginTop: '4px' }}>
                JPG or PNG, max 5MB
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleAvatarUpload}
              style={{ display: 'none' }}
            />
          </div>
        </Field>

        {/* Intent */}
        <Field label="I am looking to">
          <div style={{ display: 'flex', gap: '10px' }}>
            {(['selling', 'buying'] as Intent[]).map(opt => (
              <button key={opt} onClick={() => set('intent', opt)} style={intentBtn(form.intent === opt)}>
                {opt === 'selling' ? 'Sell my book' : 'Acquire a book'}
              </button>
            ))}
          </div>
        </Field>

        {/* Specialties */}
        <Field label="Specialties">
          <MultiSelect
            options={[...SPECIALTIES]}
            selected={form.specialties}
            onToggle={v => toggleMulti('specialties', v)}
            placeholder="Select specialties"
          />
        </Field>

        {/* Carriers */}
        <Field label="Carrier affiliations">
          <MultiSelect
            options={[...CARRIERS]}
            selected={form.carrier_affiliations}
            onToggle={v => toggleMulti('carrier_affiliations', v)}
            placeholder="Select carriers"
          />
        </Field>

        {/* Bio */}
        <Field label="Bio" hint="optional">
          <textarea
            value={form.bio}
            onChange={e => set('bio', e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="A short description of your practice and approach..."
            style={textareaStyle}
          />
          <div style={{ fontSize: '11px', color: BRAND.navy, opacity: 0.5, marginTop: '4px', textAlign: 'right', fontFamily: 'DM Sans, sans-serif' }}>
            {form.bio.length} / 500
          </div>
        </Field>

        {/* Seller fields */}
        {form.intent === 'selling' && <>
          <Divider label="Book details" />

          <Field label="AUM">
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="number" value={form.aum_value} onChange={e => set('aum_value', e.target.value)}
                placeholder="e.g. 25" style={{ ...inputStyle, flex: 2 }} />
              <select value={form.aum_unit} onChange={e => set('aum_unit', e.target.value as 'thousands' | 'millions')} style={{ ...inputStyle, flex: 1 }}>
                <option value="millions">millions</option>
                <option value="thousands">thousands</option>
              </select>
            </div>
          </Field>

          <Field label="Number of clients">
            <input type="number" value={form.client_count} onChange={e => set('client_count', e.target.value)}
              placeholder="e.g. 120" style={inputStyle} />
          </Field>

          <Divider label="Transition preferences" />

          <Field label="Preferred transition duration">
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {(['3mo', '6mo', '12mo', '18mo+'] as const).map(opt => (
                <button key={opt} onClick={() => set('transition_duration', opt)} style={chipBtn(form.transition_duration === opt)}>
                  {opt === '3mo' ? '3 months' : opt === '6mo' ? '6 months' : opt === '12mo' ? '12 months' : '18+ months'}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Willing to stay on post-sale">
            <div style={{ display: 'flex', gap: '10px' }}>
              {([true, false] as const).map(val => (
                <button key={String(val)} onClick={() => set('stay_on_postsale', val)} style={chipBtn(form.stay_on_postsale === val)}>
                  {val ? 'Yes' : 'No'}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Preferred buyer province">
            <MultiSelect
              options={[...PROVINCES]}
              selected={form.buyer_geo_pref}
              onToggle={v => toggleMulti('buyer_geo_pref', v)}
              placeholder="Select provinces"
              labelMap={PROVINCE_NAMES}
            />
          </Field>
        </>}

        {/* Buyer fields */}
        {form.intent === 'buying' && <>
          <Divider label="Acquisition criteria" />

          <Field label="Acquisition budget">
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="number" value={form.acq_budget_value} onChange={e => set('acq_budget_value', e.target.value)}
                placeholder="e.g. 5" style={{ ...inputStyle, flex: 2 }} />
              <select value={form.acq_budget_unit} onChange={e => set('acq_budget_unit', e.target.value as 'thousands' | 'millions')} style={{ ...inputStyle, flex: 1 }}>
                <option value="millions">millions</option>
                <option value="thousands">thousands</option>
              </select>
            </div>
          </Field>

          <Field label="Target geography">
            <MultiSelect
              options={[...PROVINCES]}
              selected={form.acq_geo_pref}
              onToggle={v => toggleMulti('acq_geo_pref', v)}
              placeholder="Select provinces"
              labelMap={PROVINCE_NAMES}
            />
          </Field>

          <Field label="Financing status">
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {(['self-funded', 'seeking-financing', 'undecided'] as const).map(opt => (
                <button key={opt} onClick={() => set('financing_status', opt)} style={chipBtn(form.financing_status === opt)}>
                  {opt === 'self-funded' ? 'Self-funded' : opt === 'seeking-financing' ? 'Seeking financing' : 'Undecided'}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Timeline to acquire">
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {(['0-3mo', '3-6mo', '6-12mo', '12mo+'] as const).map(opt => (
                <button key={opt} onClick={() => set('acq_timeline', opt)} style={chipBtn(form.acq_timeline === opt)}>
                  {opt === '0-3mo' ? '0–3 months' : opt === '3-6mo' ? '3–6 months' : opt === '6-12mo' ? '6–12 months' : '12+ months'}
                </button>
              ))}
            </div>
          </Field>
        </>}

        {/* Footer */}
        <div style={{ marginTop: '2.5rem', paddingBottom: '3rem' }}>
          {error && (
            <div style={{ fontSize: '13px', color: '#dc2626', marginBottom: '1rem', fontFamily: 'DM Sans, sans-serif' }}>{error}</div>
          )}
          {saved && (
            <div style={{ fontSize: '13px', color: BRAND.electric, marginBottom: '1rem', fontFamily: 'DM Sans, sans-serif' }}>Profile saved.</div>
          )}
          <button onClick={handleSubmit} disabled={submitting} style={submitBtn(submitting)}>
            {submitting ? 'Saving…' : 'Save profile'}
          </button>
        </div>

      </div>
    </div>
  )
}

function MultiSelect({ options, selected, onToggle, placeholder, labelMap }: {
  options: string[], selected: string[], onToggle: (v: string) => void,
  placeholder: string, labelMap?: Record<string, string>
}) {
  const [open, setOpen] = useState(false)
  const label = selected.length === 0 ? placeholder
    : selected.length === 1 ? (labelMap?.[selected[0]] ?? selected[0])
    : `${selected.length} selected`

  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={dropdownTrigger(open)}>
        <span style={{ color: selected.length === 0 ? '#9ca3af' : BRAND.midnight, fontFamily: 'DM Sans, sans-serif', fontSize: '14px' }}>{label}</span>
        <span style={{ fontSize: '10px', color: BRAND.navy, opacity: 0.4 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={dropdownMenu}>
          {options.map(opt => {
            const active = selected.includes(opt)
            return (
              <button key={opt} type="button" onClick={() => onToggle(opt)} style={dropdownItem(active)}>
                <span style={{
                  width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
                  border: active ? `2px solid ${BRAND.electric}` : '1.5px solid #d1d5db',
                  background: active ? BRAND.electric : 'white',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all .1s',
                }}>
                  {active && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </span>
                <span style={{ fontSize: '14px', color: BRAND.midnight, fontFamily: 'DM Sans, sans-serif' }}>{labelMap?.[opt] ?? opt}</span>
              </button>
            )
          })}
        </div>
      )}
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
          {selected.map(s => (
            <span key={s} style={selectedPill}>
              {labelMap?.[s] ?? s}
              <button type="button" onClick={() => onToggle(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 4px', color: BRAND.electric, fontSize: '14px', lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.75rem' }}>
      <label style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500, color: BRAND.midnight, marginBottom: '10px', letterSpacing: '.01em' }}>
        {label}
        {hint && <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: '6px' }}>— {hint}</span>}
      </label>
      {children}
    </div>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '2.5rem 0 1.75rem' }}>
      <div style={{ height: '1px', flex: 1, background: '#e5e7eb' }} />
      <span style={{ fontSize: '11px', letterSpacing: '.1em', textTransform: 'uppercase', color: '#9ca3af', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>{label}</span>
      <div style={{ height: '1px', flex: 1, background: '#e5e7eb' }} />
    </div>
  )
}

const intentBtn = (active: boolean): React.CSSProperties => ({
  flex: 1, padding: '12px 8px', fontSize: '13px', fontWeight: active ? 500 : 400,
  fontFamily: 'DM Sans, sans-serif', borderRadius: '8px',
  border: active ? `2px solid ${BRAND.electric}` : '1.5px solid #d1d5db',
  background: active ? BRAND.ice : 'white', color: active ? BRAND.navy : '#6b7280',
  cursor: 'pointer', transition: 'all .15s',
})

const chipBtn = (active: boolean): React.CSSProperties => ({
  padding: '9px 16px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
  fontWeight: active ? 500 : 400, borderRadius: '8px',
  border: active ? `2px solid ${BRAND.electric}` : '1.5px solid #d1d5db',
  background: active ? BRAND.ice : 'white', color: active ? BRAND.navy : '#6b7280',
  cursor: 'pointer', transition: 'all .15s',
})

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 12px', fontSize: '14px', fontFamily: 'DM Sans, sans-serif',
  borderRadius: '8px', border: '1.5px solid #d1d5db', background: 'white', color: BRAND.midnight, outline: 'none',
}

const textareaStyle: React.CSSProperties = {
  width: '100%', padding: '12px', fontSize: '14px', fontFamily: 'DM Sans, sans-serif',
  borderRadius: '8px', border: '1.5px solid #d1d5db', background: 'white',
  color: BRAND.midnight, resize: 'vertical', lineHeight: '1.6', outline: 'none',
}

const dropdownTrigger = (open: boolean): React.CSSProperties => ({
  width: '100%', padding: '11px 14px', borderRadius: open ? '8px 8px 0 0' : '8px',
  border: open ? `1.5px solid ${BRAND.electric}` : '1.5px solid #d1d5db',
  borderBottom: open ? 'none' : `1.5px solid #d1d5db`,
  background: 'white', cursor: 'pointer',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border-color .15s',
})

const dropdownMenu: React.CSSProperties = {
  position: 'absolute', top: '100%', left: 0, right: 0, background: 'white',
  border: `1.5px solid ${BRAND.electric}`, borderTop: 'none', borderRadius: '0 0 8px 8px',
  zIndex: 50, maxHeight: '220px', overflowY: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,.08)',
}

const dropdownItem = (active: boolean): React.CSSProperties => ({
  width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px',
  background: active ? '#f0f6ff' : 'white', border: 'none', borderBottom: '1px solid #f3f4f6',
  cursor: 'pointer', textAlign: 'left', transition: 'background .1s',
})

const selectedPill: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', padding: '4px 10px', fontSize: '12px',
  fontFamily: 'DM Sans, sans-serif', borderRadius: '20px', background: BRAND.ice,
  color: BRAND.navy, border: `1px solid ${BRAND.electric}`, fontWeight: 500,
}

const ghostBtn: React.CSSProperties = {
  fontSize: '13px', color: '#6b7280', fontFamily: 'DM Sans, sans-serif',
  background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0', marginTop: '4px',
}

const submitBtn = (disabled: boolean): React.CSSProperties => ({
  width: '100%', padding: '14px', fontSize: '14px', fontWeight: 500,
  fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', border: 'none',
  background: disabled ? '#d1d5db' : BRAND.electric,
  color: disabled ? '#9ca3af' : 'white',
  cursor: disabled ? 'not-allowed' : 'pointer', transition: 'background .15s',
})