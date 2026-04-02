'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const BRAND = {
  midnight: '#0D1B3E',
  navy: '#1A3266',
  electric: '#3B82F6',
  ice: '#DBEAFE',
  chalk: '#F8F7F4',
}

const PROVINCES = [
  { value: 'AB', label: 'Alberta' },
  { value: 'BC', label: 'British Columbia' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'NB', label: 'New Brunswick' },
  { value: 'NL', label: 'Newfoundland' },
  { value: 'NS', label: 'Nova Scotia' },
  { value: 'NT', label: 'Northwest Territories' },
  { value: 'NU', label: 'Nunavut' },
  { value: 'ON', label: 'Ontario' },
  { value: 'PE', label: 'PEI' },
  { value: 'QC', label: 'Quebec' },
  { value: 'SK', label: 'Saskatchewan' },
  { value: 'YT', label: 'Yukon' },
]

type Step = 'token' | 'register' | 'done'

// ── Logo ─────────────────────────────────────────────────────────

function KlarumLogo() {
  return (
    <a href="/" style={{ textDecoration: 'none', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <svg width="28" height="19" viewBox="0 0 44 30" fill="none">
          <rect x="1" y="1" width="3.5" height="28" fill="#0D1B3E" />
          <path d="M4.5 15 L18 1" stroke="#0D1B3E" strokeWidth="3" strokeLinecap="square" />
          <path d="M4.5 15 L18 29" stroke="#0D1B3E" strokeWidth="3" strokeLinecap="square" />
          <line x1="18" y1="4" x2="34" y2="15" stroke="#0D1B3E" strokeWidth="0.75" opacity="0.35" />
          <line x1="18" y1="26" x2="34" y2="15" stroke="#0D1B3E" strokeWidth="0.75" opacity="0.35" />
          <circle cx="34" cy="15" r="7" fill="#3B82F6" />
        </svg>
        <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 600, color: BRAND.midnight, letterSpacing: '-0.02em', lineHeight: 1 }}>
          klarum
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '20px', height: '1px', background: BRAND.electric }} />
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: BRAND.electric }}>
          Novation
        </span>
      </div>
    </a>
  )
}

// ── Page ─────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('token')

  // Token step
  const [code, setCode] = useState('')
  const [validatedCode, setValidatedCode] = useState('')
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [tokenLoading, setTokenLoading] = useState(false)

  // Registration step
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    province: '',
    years_in_practice: '',
  })
  const [regError, setRegError] = useState<string | null>(null)
  const [regLoading, setRegLoading] = useState(false)

  function setField(key: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleTokenSubmit() {
    if (!code.trim()) return setTokenError('Please enter your invite code.')
    setTokenError(null)
    setTokenLoading(true)

    const res = await fetch('/api/validate-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim() }),
    })

    const data = await res.json()
    setTokenLoading(false)

    if (!data.valid) {
      setTokenError(data.error ?? 'Invalid invite code.')
      return
    }

    setValidatedCode(code.trim().toUpperCase())
    setStep('register')
  }

  async function handleRegisterSubmit() {
    const { full_name, email, password, phone, province, years_in_practice } = form

    if (!full_name || !email || !password || !phone || !province || !years_in_practice) {
      return setRegError('Please fill in all fields.')
    }
    if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
      return setRegError('Enter a 10-digit phone number.')
    }
    if (password.length < 8) {
      return setRegError('Password must be at least 8 characters.')
    }

    setRegError(null)
    setRegLoading(true)

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        phone: form.phone.replace(/\D/g, ''),
        years_in_practice: Number(years_in_practice),
        invite_code: validatedCode,
      }),
    })

    const data = await res.json()
    setRegLoading(false)

    if (!res.ok) {
      setRegError(data.error ?? 'Something went wrong.')
      return
    }

    setStep('done')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: BRAND.chalk,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <KlarumLogo />
        </div>

        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid rgba(11,31,58,0.08)', padding: '2.5rem' }}>

          {/* ── Step 1: Token ── */}
          {step === 'token' && (
            <>
              <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '26px', fontWeight: 400, color: BRAND.navy, marginBottom: '.5rem', lineHeight: 1.2 }}>
                  Enter your invite code
                </h1>
                <p style={{ fontSize: '13px', color: '#6B7280', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6 }}>
                  Novation is currently invite-only. Enter your code to create an account.
                </p>
              </div>

              <Field label="Invite code">
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && handleTokenSubmit()}
                  placeholder="e.g. KLARUM-BETA-001"
                  style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: '.05em' }}
                  autoFocus
                />
              </Field>

              {tokenError && <ErrorMsg>{tokenError}</ErrorMsg>}

              <button
                onClick={handleTokenSubmit}
                disabled={tokenLoading}
                style={submitBtn(tokenLoading)}
              >
                {tokenLoading ? 'Checking…' : 'Continue →'}
              </button>

              <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '13px', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif' }}>
                Already have an account?{' '}
                <a href="/login" style={{ color: BRAND.electric, textDecoration: 'none' }}>Sign in</a>
              </div>
            </>
          )}

          {/* ── Step 2: Register ── */}
          {step === 'register' && (
            <>
              <div style={{ marginBottom: '2rem' }}>
                <button
                  onClick={() => setStep('token')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif', padding: 0, marginBottom: '1rem' }}
                >
                  ← Back
                </button>
                <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '26px', fontWeight: 400, color: BRAND.navy, marginBottom: '.5rem', lineHeight: 1.2 }}>
                  Create your account
                </h1>
                <p style={{ fontSize: '13px', color: '#6B7280', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6 }}>
                  Code accepted. Fill in your details to get started.
                </p>
              </div>

              <Field label="Full name">
                <input
                  type="text"
                  value={form.full_name}
                  onChange={e => setField('full_name', e.target.value)}
                  placeholder="Jane Smith"
                  style={inputStyle}
                />
              </Field>

              <Field label="Email">
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setField('email', e.target.value)}
                  placeholder="jane@example.com"
                  style={inputStyle}
                />
              </Field>

              <Field label="Password">
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setField('password', e.target.value)}
                  placeholder="8+ characters"
                  style={inputStyle}
                />
              </Field>

              <Field label="Phone number">
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setField('phone', e.target.value)}
                  placeholder="6475551234"
                  style={inputStyle}
                />
              </Field>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <Field label="Province">
                    <select
                      value={form.province}
                      onChange={e => setField('province', e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">Select…</option>
                      {PROVINCES.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div style={{ flex: 1 }}>
                  <Field label="Years in practice">
                    <input
                      type="number"
                      value={form.years_in_practice}
                      onChange={e => setField('years_in_practice', e.target.value)}
                      placeholder="e.g. 12"
                      min="0"
                      max="60"
                      style={inputStyle}
                    />
                  </Field>
                </div>
              </div>

              {regError && <ErrorMsg>{regError}</ErrorMsg>}

              <button
                onClick={handleRegisterSubmit}
                disabled={regLoading}
                style={submitBtn(regLoading)}
              >
                {regLoading ? 'Creating account…' : 'Create account →'}
              </button>

              <p style={{ marginTop: '1rem', fontSize: '12px', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6, textAlign: 'center' }}>
                By creating an account you agree to our terms of service and privacy policy.
              </p>
            </>
          )}

          {/* ── Step 3: Check email ── */}
          {step === 'done' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: BRAND.ice, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={BRAND.electric} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="M2 7l10 7 10-7"/>
                </svg>
              </div>
              <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', fontWeight: 400, color: BRAND.navy, marginBottom: '.75rem' }}>
                Check your inbox
              </h1>
              <p style={{ fontSize: '13px', color: '#6B7280', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                We've sent a verification email to <strong style={{ color: BRAND.midnight }}>{form.email}</strong>. Click the link to activate your account and continue to Novation.
              </p>
              <div style={{ background: BRAND.chalk, borderRadius: '8px', padding: '12px 16px', fontSize: '12px', color: '#6B7280', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6 }}>
                Didn't get it? Check your spam folder or contact{' '}
                <a href="mailto:hello@klarum.ca" style={{ color: BRAND.electric, textDecoration: 'none' }}>hello@klarum.ca</a>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

const BRAND_FOR_FIELD = { midnight: '#0D1B3E' }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: BRAND_FOR_FIELD.midnight, fontFamily: 'DM Sans, sans-serif', marginBottom: '6px' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function ErrorMsg({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '13px', color: '#DC2626', fontFamily: 'DM Sans, sans-serif', marginBottom: '1rem' }}>
      {children}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 12px',
  fontSize: '14px',
  fontFamily: 'DM Sans, sans-serif',
  borderRadius: '8px',
  border: '1px solid rgba(11,31,58,0.12)',
  background: 'white',
  color: '#0D1B3E',
  outline: 'none',
  boxSizing: 'border-box',
}

const submitBtn = (disabled: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '14px',
  fontSize: '15px',
  fontWeight: 500,
  fontFamily: 'DM Sans, sans-serif',
  borderRadius: '8px',
  border: 'none',
  background: disabled ? '#E5E7EB' : '#0D1B3E',
  color: disabled ? '#9CA3AF' : '#ffffff',
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'background .15s',
  marginTop: '0.25rem',
})