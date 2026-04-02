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

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!email || !password) return setError('Please enter your email and password.')
    setError(null)
    setLoading(true)

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Invalid email or password.')
      return
    }

    router.push('/profile')
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

        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <KlarumLogo />
        </div>

        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid rgba(11,31,58,0.08)', padding: '2.5rem' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '26px', fontWeight: 400, color: BRAND.navy, marginBottom: '.5rem', lineHeight: 1.2 }}>
              Sign in
            </h1>
            <p style={{ fontSize: '13px', color: '#6B7280', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6 }}>
              Welcome back to Novation.
            </p>
          </div>

          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="jane@example.com"
              style={inputStyle}
              autoFocus
            />
          </Field>

          <Field label="Password">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="••••••••"
              style={inputStyle}
            />
          </Field>

          {error && (
            <div style={{ fontSize: '13px', color: '#DC2626', fontFamily: 'DM Sans, sans-serif', marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={submitBtn(loading)}
          >
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '13px', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif' }}>
            Don't have an account?{' '}
            <a href="/register" style={{ color: BRAND.electric, textDecoration: 'none' }}>Request access</a>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: BRAND.midnight, fontFamily: 'DM Sans, sans-serif', marginBottom: '6px' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

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