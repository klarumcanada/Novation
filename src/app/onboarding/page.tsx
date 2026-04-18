'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { SPECIALTIES, CARRIERS } from '@/lib/validations'

type Intent = 'selling' | 'buying'
type BookMix = 'life' | 'investments' | 'mixed'

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

// ── Valuation logic ───────────────────────────────────────────────

function calcValuation(
  revenue: number,
  mix: BookMix,
  expenseRatio: number,
  timeline: string,
  retention: number,
  years: number,
): { low: number; high: number; method: 'revenue' | 'ebitda' } {
  let low: number
  let high: number
  let method: 'revenue' | 'ebitda'

  if (revenue >= 1_000_000) {
    // EBITDA path
    method = 'ebitda'
    const ebitda = revenue * (1 - expenseRatio / 100)
    low = ebitda * 5.0
    high = ebitda * 6.0
  } else {
    // Revenue multiple path
    method = 'revenue'
    if (mix === 'life') { low = revenue * 1.5; high = revenue * 2.0 }
    else if (mix === 'investments') { low = revenue * 2.0; high = revenue * 2.5 }
    else { low = revenue * 2.0; high = revenue * 2.5 }
  }

  // Adjustments (±10% each)
  // Timeline: faster = higher
  const timelineAdj = timeline === '0–6 months' ? 1.05
    : timeline === '6–12 months' ? 1.0
    : timeline === '1–2 years' ? 0.97
    : 0.93

  // Retention
  const retentionAdj = retention >= 95 ? 1.08
    : retention >= 85 ? 1.0
    : retention >= 75 ? 0.95
    : 0.90

  // Years in practice
  const yearsAdj = years >= 20 ? 1.05
    : years >= 10 ? 1.0
    : years >= 5 ? 0.97
    : 0.93

  low = Math.round(low * timelineAdj * retentionAdj * yearsAdj)
  high = Math.round(high * timelineAdj * retentionAdj * yearsAdj)

  return { low, high, method }
}

function fmt(n: number) {
  return '$' + n.toLocaleString('en-CA', { maximumFractionDigits: 0 })
}

export default function OnboardingPage() {
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [intent, setIntent] = useState<Intent | null>(null)
  const [specialties, setSpecialties] = useState<string[]>([])
  const [carriers, setCarriers] = useState<string[]>([])
  const [bio, setBio] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [avatarUrl, setAvatarUrl]   = useState<string | null>(null)
  const [uploading, setUploading]   = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Seller fields
  const [aum, setAum] = useState('')
  const [clientCount, setClientCount] = useState('')
  const [targetProvinces, setTargetProvinces] = useState<string[]>([])
  const [targetCities, setTargetCities] = useState<string[]>([])
  const [transitionDuration, setTransitionDuration] = useState('')
  const [willingToStay, setWillingToStay] = useState(false)
  const [bookValue, setBookValue] = useState('')

  // Estimator state
  const [estimatorOpen, setEstimatorOpen] = useState(false)
  const [estRevenue, setEstRevenue] = useState('')
  const [estMix, setEstMix] = useState<BookMix | null>(null)
  const [estExpenseRatio, setEstExpenseRatio] = useState('40')
  const [estRetention, setEstRetention] = useState('90')
  const [estYears, setEstYears] = useState('')
  const [estResult, setEstResult] = useState<{ low: number; high: number; method: 'revenue' | 'ebitda' } | null>(null)

  // Buyer fields
  const [acquisitionBudget, setAcquisitionBudget] = useState('')
  const [acquisitionTimeline, setAcquisitionTimeline] = useState('')
  const [buyerTargetProvinces, setBuyerTargetProvinces] = useState<string[]>([])
  const [buyerTargetCities, setBuyerTargetCities] = useState<string[]>([])

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploading(false); return }
    const ext  = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadError) { setError(`Upload failed: ${uploadError.message}`); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    setAvatarUrl(`${publicUrl}?t=${Date.now()}`)
    setUploading(false)
  }

  function toggleMulti(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value])
  }

  function runEstimator() {
    if (!estRevenue || !estMix) return
    const result = calcValuation(
      Number(estRevenue),
      estMix,
      Number(estExpenseRatio),
      transitionDuration,
      Number(estRetention),
      Number(estYears) || 10,
    )
    setEstResult(result)
  }

  function applyEstimate(value: number) {
    setBookValue(String(value))
    setEstimatorOpen(false)
    setEstResult(null)
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
      avatar_url: avatarUrl ?? undefined,
    }

    if (intent === 'selling') {
      payload.aum = aum ? Number(aum) : null
      payload.client_count = clientCount ? Number(clientCount) : null
      payload.target_provinces = targetProvinces.length ? targetProvinces : null
      payload.target_cities = targetCities.length ? targetCities : null
      payload.transition_duration = transitionDuration || null
      payload.willing_to_stay = willingToStay
      payload.book_value = bookValue ? Number(bookValue) : null
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

        {/* Profile photo */}
        <Field label="Profile photo">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
              background: BRAND.ice, border: '2px solid #E5E7EB',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 24, color: BRAND.navy, opacity: 0.4 }}>+</span>
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

            {/* Book value + estimator */}
            <Field label="Estimated book value (CAD)">
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
              <button
                type="button"
                onClick={() => { setEstimatorOpen(o => !o); setEstResult(null) }}
                style={{
                  marginTop: '8px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '13px', color: BRAND.electric,
                  fontFamily: 'DM Sans, sans-serif', padding: '0',
                  display: 'flex', alignItems: 'center', gap: '5px',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  transform: estimatorOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  fontSize: '11px',
                }}>▶</span>
                Help me estimate my book value
              </button>

              {/* Inline estimator */}
              {estimatorOpen && (
                <div style={{
                  marginTop: '16px',
                  background: 'white',
                  border: `1.5px solid ${BRAND.electric}`,
                  borderRadius: '12px',
                  padding: '24px',
                }}>
                  <div style={{
                    fontSize: '13px', fontWeight: 600, color: BRAND.midnight,
                    fontFamily: 'DM Sans, sans-serif', marginBottom: '20px',
                    letterSpacing: '0.01em',
                  }}>
                    Book value estimator
                  </div>

                  {/* Annual revenue */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={estLabel}>Annual revenue (CAD) *</label>
                    <div style={{ position: 'relative' }}>
                      <span style={currencyPrefix}>$</span>
                      <input
                        type="number"
                        value={estRevenue}
                        onChange={e => { setEstRevenue(e.target.value); setEstResult(null) }}
                        placeholder="e.g. 450000"
                        style={{ ...inputStyle, paddingLeft: '28px' }}
                      />
                    </div>
                    {Number(estRevenue) >= 1_000_000 && (
                      <div style={{ fontSize: '12px', color: BRAND.electric, marginTop: '4px', fontFamily: 'DM Sans, sans-serif' }}>
                        EBITDA-based valuation will be used for books over $1M revenue.
                      </div>
                    )}
                  </div>

                  {/* Book mix */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={estLabel}>Book composition *</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {([
                        ['life', 'Life insurance heavy', '1.5×–2.0× revenue'],
                        ['investments', 'Investments / AUM heavy', '2.0×–2.5× revenue'],
                        ['mixed', 'Mixed book', '2.0×–2.5× revenue'],
                      ] as [BookMix, string, string][]).map(([val, label, hint]) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => { setEstMix(val); setEstResult(null) }}
                          style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: estMix === val ? `2px solid ${BRAND.electric}` : '1.5px solid #d1d5db',
                            background: estMix === val ? BRAND.ice : 'white',
                            cursor: 'pointer', textAlign: 'left',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          }}
                        >
                          <span style={{ fontSize: '13px', fontWeight: estMix === val ? 500 : 400, color: BRAND.midnight, fontFamily: 'DM Sans, sans-serif' }}>
                            {label}
                          </span>
                          <span style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif' }}>
                            {hint}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* EBITDA path: expense ratio */}
                  {Number(estRevenue) >= 1_000_000 && (
                    <div style={{ marginBottom: '16px' }}>
                      <label style={estLabel}>Estimated expense ratio (%)</label>
                      <div style={{ fontSize: '12px', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif', marginBottom: '6px' }}>
                        Typical range is 30–50%. Leave at 40% if unsure.
                      </div>
                      <input
                        type="number"
                        min="10"
                        max="80"
                        value={estExpenseRatio}
                        onChange={e => { setEstExpenseRatio(e.target.value); setEstResult(null) }}
                        style={{ ...inputStyle, width: '120px' }}
                      />
                    </div>
                  )}

                  {/* Retention */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={estLabel}>Client retention rate (%)</label>
                    <input
                      type="number"
                      min="50"
                      max="100"
                      value={estRetention}
                      onChange={e => { setEstRetention(e.target.value); setEstResult(null) }}
                      placeholder="90"
                      style={{ ...inputStyle, width: '120px' }}
                    />
                  </div>

                  {/* Years in practice */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={estLabel}>Years in practice</label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={estYears}
                      onChange={e => { setEstYears(e.target.value); setEstResult(null) }}
                      placeholder="e.g. 15"
                      style={{ ...inputStyle, width: '120px' }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={runEstimator}
                    disabled={!estRevenue || !estMix}
                    style={{
                      width: '100%', padding: '11px', fontSize: '13px', fontWeight: 500,
                      fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', border: 'none',
                      background: (!estRevenue || !estMix) ? '#d1d5db' : BRAND.electric,
                      color: (!estRevenue || !estMix) ? '#9ca3af' : 'white',
                      cursor: (!estRevenue || !estMix) ? 'not-allowed' : 'pointer',
                      transition: 'background .15s',
                    }}
                  >
                    Calculate estimate
                  </button>

                  {/* Result */}
                  {estResult && (
                    <div style={{
                      marginTop: '20px',
                      background: BRAND.chalk,
                      borderRadius: '10px',
                      padding: '20px',
                      border: '1px solid rgba(11,31,58,0.07)',
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif', marginBottom: '8px' }}>
                        Estimated range
                      </div>
                      <div style={{
                        fontFamily: 'Playfair Display, serif',
                        fontSize: '28px', fontWeight: 400,
                        color: BRAND.midnight, letterSpacing: '-0.02em',
                        marginBottom: '4px',
                      }}>
                        {fmt(estResult.low)} – {fmt(estResult.high)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif', marginBottom: '16px', lineHeight: 1.5 }}>
                        {estResult.method === 'ebitda'
                          ? `Based on estimated EBITDA × 5.0–6.0×. Adjusted for retention, timeline, and experience.`
                          : `Based on ${estMix === 'life' ? '1.5–2.0×' : '2.0–2.5×'} revenue multiple. Adjusted for retention, timeline, and experience.`
                        }
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => applyEstimate(estResult.low)}
                          style={applyBtn(false)}
                        >
                          Use low ({fmt(estResult.low)})
                        </button>
                        <button
                          type="button"
                          onClick={() => applyEstimate(Math.round((estResult.low + estResult.high) / 2))}
                          style={applyBtn(true)}
                        >
                          Use midpoint
                        </button>
                        <button
                          type="button"
                          onClick={() => applyEstimate(estResult.high)}
                          style={applyBtn(false)}
                        >
                          Use high ({fmt(estResult.high)})
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
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

const estLabel: React.CSSProperties = {
  display: 'block',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '12px',
  fontWeight: 500,
  color: '#6B7280',
  marginBottom: '6px',
  letterSpacing: '0.01em',
}

const applyBtn = (primary: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '8px 10px',
  fontSize: '12px',
  fontFamily: 'DM Sans, sans-serif',
  fontWeight: 500,
  borderRadius: '7px',
  border: primary ? 'none' : `1.5px solid #d1d5db`,
  background: primary ? BRAND.electric : 'white',
  color: primary ? 'white' : BRAND.navy,
  cursor: 'pointer',
  transition: 'all .15s',
  textAlign: 'center' as const,
})

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