'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SPECIALTIES, CARRIERS } from '@/lib/validations'

type Intent = 'selling' | 'buying'

const BRAND = {
  midnight: '#0D1B3E',
  navy: '#1A3266',
  electric: '#3B82F6',
  ice: '#DBEAFE',
  chalk: '#F8F7F4',
  voltage: '#E8C547',
}

const PROVINCES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT']
const TRANSITION_DURATIONS = ['0–6 months', '6–12 months', '1–2 years', '2+ years']
const ACQUISITION_TIMELINES = ['0–6 months', '6–12 months', '1–2 years', '2+ years']

export default function OnboardingPage() {
  const router = useRouter()

  const [intent, setIntent] = useState<Intent | null>(null)
  const [specialties, setSpecialties] = useState<string[]>([])
  const [carriers, setCarriers] = useState<string[]>([])
  const [bio, setBio] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Seller fields
  const [aum, setAum] = useState('')
  const [clientCount, setClientCount] = useState('')
  const [targetProvinces, setTargetProvinces] = useState<string[]>([])
  const [targetCities, setTargetCities] = useState<string[]>([])
  const [transitionDuration, setTransitionDuration] = useState('')
  const [willingToStay, setWillingToStay] = useState(false)

  // Buyer fields
  const [acquisitionBudget, setAcquisitionBudget] = useState('')
  const [acquisitionTimeline, setAcquisitionTimeline] = useState('')
  const [buyerTargetProvinces, setBuyerTargetProvinces] = useState<string[]>([])
  const [buyerTargetCities, setBuyerTargetCities] = useState<string[]>([])

  function toggleMulti(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value])
  }

  async function handleSubmit() {
    if (!intent) return setError('Please select your intent.')
    if (specialties.length === 0) return setError('Select at least one specialty.')
    if (carriers.length === 0) return setError('Select at least one carrier.')
    setError(null)
    setSubmitting(true)

    const payload: Record<string, unknown> = {
      intent,
      specialties,
      carrier_affiliations: carriers,
      bio,
    }

    if (intent === 'selling') {
      payload.aum = aum ? Number(aum) : null
      payload.client_count = clientCount ? Number(clientCount) : null
      payload.target_provinces = targetProvinces.length ? targetProvinces : null
      payload.target_cities = targetCities.length ? targetCities : null
      payload.transition_duration = transitionDuration || null
      payload.willing_to_stay = willingToStay
    } else {
      payload.acquisition_budget = acquisitionBudget ? Number(acquisitionBudget) : null
      payload.acquisition_timeline = acquisitionTimeline || null
      payload.target_provinces = buyerTargetProvinces.length ? buyerTargetProvinces : null
      payload.target_cities = buyerTargetCities.length ? buyerTargetCities : null
    }

    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong.')
      setSubmitting(false)
      return
    }

    router.push('/profile')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: BRAND.chalk,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '4rem 1.5rem',
    }}>
      <div style={{ width: '100%', maxWidth: '540px' }}>

        {/* Header */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{
            fontSize: '11px', letterSpacing: '.12em', textTransform: 'uppercase',
            color: BRAND.electric, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, marginBottom: '1rem',
          }}>
            Klarum Novation
          </div>
          <h1 style={{
            fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: 400,
            color: BRAND.midnight, marginBottom: '.75rem', lineHeight: 1.2,
          }}>
            Set up your profile
          </h1>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: BRAND.navy, opacity: 0.7, lineHeight: 1.6 }}>
            Takes about two minutes. You can update everything later.
          </p>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#9CA3AF', marginTop: '8px' }}>
            Fields marked <span style={{ color: '#DC2626' }}>*</span> are required.
          </p>
        </div>

        {/* Intent */}
        <Field label="I am looking to" required>
          <div style={{ display: 'flex', gap: '10px' }}>
            {(['selling', 'buying'] as Intent[]).map(opt => (
              <button
                key={opt}
                onClick={() => setIntent(opt)}
                style={intentBtn(intent === opt)}
              >
                {opt === 'selling' ? 'Sell my book' : 'Acquire a book'}
              </button>
            ))}
          </div>
        </Field>

        {/* Seller fields */}
        {intent === 'selling' && (
          <>
            <Field label="Estimated AUM" tooltip="Assets Under Management — the total market value of investments your clients have entrusted you to manage on their behalf.">
              <div style={{ position: 'relative' }}>
                <span style={currencyPrefix}>$</span>
                <input
                  type="number"
                  value={aum}
                  onChange={e => setAum(e.target.value)}
                  placeholder="e.g. 25000000"
                  style={{ ...inputStyle, paddingLeft: '28px' }}
                />
              </div>
            </Field>

            <Field label="Number of clients">
              <input
                type="number"
                value={clientCount}
                onChange={e => setClientCount(e.target.value)}
                placeholder="e.g. 150"
                style={inputStyle}
              />
            </Field>

            <Field label="Target geography — Province">
              <MultiSelect
                options={PROVINCES}
                selected={targetProvinces}
                onToggle={v => toggleMulti(targetProvinces, setTargetProvinces, v)}
                placeholder="Select provinces"
              />
            </Field>

            <Field label="Target geography — City">
              <CityInput
                cities={targetCities}
                setCities={setTargetCities}
              />
            </Field>

            <Field label="Transition window">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {TRANSITION_DURATIONS.map(d => (
                  <ToggleChip
                    key={d}
                    label={d}
                    active={transitionDuration === d}
                    onClick={() => setTransitionDuration(transitionDuration === d ? '' : d)}
                  />
                ))}
              </div>
            </Field>

            <Field label="">
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={willingToStay}
                  onChange={e => setWillingToStay(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: BRAND.electric }}
                />
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: BRAND.midnight }}>
                  I'm open to staying on post-sale during transition
                </span>
              </label>
            </Field>
          </>
        )}

        {/* Buyer fields */}
        {intent === 'buying' && (
          <>
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

            <Field label="Target geography — Province">
              <MultiSelect
                options={PROVINCES}
                selected={buyerTargetProvinces}
                onToggle={v => toggleMulti(buyerTargetProvinces, setBuyerTargetProvinces, v)}
                placeholder="Select provinces"
              />
            </Field>

            <Field label="Target geography — City">
              <CityInput
                cities={buyerTargetCities}
                setCities={setBuyerTargetCities}
              />
            </Field>

            <Field label="Acquisition timeline">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {ACQUISITION_TIMELINES.map(t => (
                  <ToggleChip
                    key={t}
                    label={t}
                    active={acquisitionTimeline === t}
                    onClick={() => setAcquisitionTimeline(acquisitionTimeline === t ? '' : t)}
                  />
                ))}
              </div>
            </Field>
          </>
        )}

        {/* Common fields */}
        {intent && (
          <>
            <Field label="Specialties" required>
              <MultiSelect
                options={[...SPECIALTIES]}
                selected={specialties}
                onToggle={v => toggleMulti(specialties, setSpecialties, v)}
                placeholder="Select specialties"
              />
            </Field>

            <Field label="Carrier affiliations" required>
              <MultiSelect
                options={[...CARRIERS]}
                selected={carriers}
                onToggle={v => toggleMulti(carriers, setCarriers, v)}
                placeholder="Select carriers"
              />
            </Field>

            <Field label="Bio">
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                maxLength={500}
                rows={4}
                placeholder="A short description of your practice and approach..."
                style={textareaStyle}
              />
              <div style={{ fontSize: '11px', color: BRAND.navy, opacity: 0.5, marginTop: '4px', textAlign: 'right' }}>
                {bio.length} / 500
              </div>
            </Field>

            {error && (
              <div style={{ fontSize: '13px', color: '#dc2626', marginBottom: '1rem', fontFamily: 'DM Sans, sans-serif' }}>
                {error}
              </div>
            )}

            <button onClick={handleSubmit} disabled={submitting} style={submitBtn(submitting)}>
              {submitting ? 'Saving…' : 'Continue to profile →'}
            </button>
          </>
        )}

      </div>
    </div>
  )
}

// ── CityInput ─────────────────────────────────────────────────────

function CityInput({ cities, setCities }: { cities: string[]; setCities: (v: string[]) => void }) {
  const [input, setInput] = useState('')

  function addCity() {
    const trimmed = input.trim()
    if (trimmed && !cities.includes(trimmed)) {
      setCities([...cities, trimmed])
    }
    setInput('')
  }

  function removeCity(city: string) {
    setCities(cities.filter(c => c !== city))
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCity() } }}
          placeholder="Type a city and press Enter"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          onClick={addCity}
          type="button"
          style={{
            padding: '11px 16px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
            borderRadius: '8px', border: `1.5px solid ${BRAND.electric}`,
            background: BRAND.ice, color: BRAND.navy, cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          Add
        </button>
      </div>
      {cities.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
          {cities.map(c => (
            <span key={c} style={selectedPill}>
              {c}
              <button
                onClick={() => removeCity(c)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 4px', color: BRAND.electric, fontSize: '14px', lineHeight: 1 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── MultiSelect ───────────────────────────────────────────────────

function MultiSelect({
  options, selected, onToggle, placeholder, labelMap,
}: {
  options: string[]
  selected: string[]
  onToggle: (v: string) => void
  placeholder: string
  labelMap?: Record<string, string>
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const label = selected.length === 0
    ? placeholder
    : selected.length === 1
    ? (labelMap?.[selected[0]] ?? selected[0])
    : `${selected.length} selected`

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={dropdownTrigger(open)} type="button">
        <span style={{ color: selected.length === 0 ? '#9ca3af' : BRAND.midnight }}>{label}</span>
        <span style={{ fontSize: '10px', color: BRAND.navy, opacity: 0.5 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={dropdownMenu}>
          {options.map(opt => {
            const active = selected.includes(opt)
            return (
              <button key={opt} onClick={() => onToggle(opt)} style={dropdownItem(active)} type="button">
                <span style={{
                  width: '16px', height: '16px', borderRadius: '4px',
                  border: active ? `2px solid ${BRAND.electric}` : `1.5px solid #d1d5db`,
                  background: active ? BRAND.electric : 'white',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'all .1s',
                }}>
                  {active && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
                <span style={{ fontSize: '14px', color: BRAND.midnight, fontFamily: 'DM Sans, sans-serif' }}>
                  {labelMap?.[opt] ?? opt}
                </span>
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
              <button onClick={() => onToggle(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 4px', color: BRAND.electric, fontSize: '14px', lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── ToggleChip ────────────────────────────────────────────────────

function ToggleChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        padding: '8px 14px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
        borderRadius: '8px',
        border: active ? `2px solid ${BRAND.electric}` : '1.5px solid #d1d5db',
        background: active ? BRAND.ice : 'white',
        color: active ? BRAND.navy : '#6b7280',
        cursor: 'pointer', fontWeight: active ? 500 : 400, transition: 'all .15s',
      }}
    >
      {label}
    </button>
  )
}

// ── Field ─────────────────────────────────────────────────────────

function Field({ label, required, tooltip, children }: {
  label: string
  required?: boolean
  tooltip?: string
  children: React.ReactNode
}) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div style={{ marginBottom: '2rem' }}>
      {label && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
          <label style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
            fontWeight: 500, color: BRAND.midnight, letterSpacing: '.01em',
          }}>
            {label}
            {required && <span style={{ color: '#DC2626', marginLeft: '3px' }}>*</span>}
          </label>
          {tooltip && (
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <div
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                style={{
                  width: '15px', height: '15px', borderRadius: '50%',
                  background: '#E5E7EB', color: '#6B7280',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: 600, cursor: 'default',
                  fontFamily: 'DM Sans, sans-serif', userSelect: 'none',
                }}
              >
                i
              </div>
              {showTooltip && (
                <div style={{
                  position: 'absolute', bottom: '120%', left: '50%', transform: 'translateX(-50%)',
                  background: BRAND.midnight, color: 'white', fontSize: '12px',
                  fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5,
                  padding: '8px 12px', borderRadius: '8px', width: '240px',
                  zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,.15)',
                }}>
                  {tooltip}
                  <div style={{
                    position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                    width: 0, height: 0,
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderTop: `5px solid ${BRAND.midnight}`,
                  }} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────

const intentBtn = (active: boolean): React.CSSProperties => ({
  flex: 1, padding: '12px 8px', fontSize: '13px',
  fontWeight: active ? 500 : 400, fontFamily: 'DM Sans, sans-serif',
  borderRadius: '8px',
  border: active ? `2px solid ${BRAND.electric}` : '1.5px solid #d1d5db',
  background: active ? BRAND.ice : 'white',
  color: active ? BRAND.navy : '#6b7280',
  cursor: 'pointer', transition: 'all .15s',
})

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 12px', fontSize: '14px',
  fontFamily: 'DM Sans, sans-serif', borderRadius: '8px',
  border: '1.5px solid #d1d5db', background: 'white',
  color: BRAND.midnight, outline: 'none', boxSizing: 'border-box',
}

const currencyPrefix: React.CSSProperties = {
  position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
  fontSize: '14px', color: '#9ca3af', fontFamily: 'DM Sans, sans-serif', pointerEvents: 'none',
}

const dropdownTrigger = (open: boolean): React.CSSProperties => ({
  width: '100%', padding: '11px 14px', fontSize: '14px',
  fontFamily: 'DM Sans, sans-serif',
  borderRadius: open ? '8px 8px 0 0' : '8px',
  border: open ? `1.5px solid ${BRAND.electric}` : '1.5px solid #d1d5db',
  background: 'white', cursor: 'pointer',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  transition: 'border-color .15s',
})

const dropdownMenu: React.CSSProperties = {
  position: 'absolute', top: '100%', left: 0, right: 0,
  background: 'white', border: `1.5px solid ${BRAND.electric}`,
  borderTop: 'none', borderRadius: '0 0 8px 8px',
  zIndex: 50, maxHeight: '220px', overflowY: 'auto',
  boxShadow: '0 4px 16px rgba(0,0,0,.08)',
}

const dropdownItem = (active: boolean): React.CSSProperties => ({
  width: '100%', padding: '10px 14px',
  display: 'flex', alignItems: 'center', gap: '10px',
  background: active ? '#f0f6ff' : 'white',
  border: 'none', borderBottom: '1px solid #f3f4f6',
  cursor: 'pointer', textAlign: 'left', transition: 'background .1s',
})

const selectedPill: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center',
  padding: '4px 10px', fontSize: '12px',
  fontFamily: 'DM Sans, sans-serif', borderRadius: '20px',
  background: BRAND.ice, color: BRAND.navy,
  border: `1px solid ${BRAND.electric}`, fontWeight: 500,
}

const textareaStyle: React.CSSProperties = {
  width: '100%', padding: '12px', fontSize: '14px',
  fontFamily: 'DM Sans, sans-serif', borderRadius: '8px',
  border: '1.5px solid #d1d5db', background: 'white',
  color: BRAND.midnight, resize: 'vertical', lineHeight: '1.6', outline: 'none',
}

const submitBtn = (disabled: boolean): React.CSSProperties => ({
  width: '100%', padding: '14px', fontSize: '14px', fontWeight: 500,
  fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', border: 'none',
  background: disabled ? '#d1d5db' : BRAND.electric,
  color: disabled ? '#9ca3af' : 'white',
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'background .15s', letterSpacing: '.01em',
})