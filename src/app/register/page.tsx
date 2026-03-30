'use client'

import { useState } from 'react'

const PROVINCES = [
  { value: 'AB', label: 'Alberta' },
  { value: 'BC', label: 'British Columbia' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'NB', label: 'New Brunswick' },
  { value: 'NL', label: 'Newfoundland and Labrador' },
  { value: 'NS', label: 'Nova Scotia' },
  { value: 'ON', label: 'Ontario' },
  { value: 'PE', label: 'Prince Edward Island' },
  { value: 'QC', label: 'Quebec' },
  { value: 'SK', label: 'Saskatchewan' },
  { value: 'NT', label: 'Northwest Territories' },
  { value: 'NU', label: 'Nunavut' },
  { value: 'YT', label: 'Yukon' },
]

type Step = 'invite' | 'register' | 'success'

export default function RegisterPage() {
  const [step, setStep] = useState<Step>('invite')
  const [inviteCode, setInviteCode] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    province: '',
    years_in_practice: '',
  })
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault()
    setInviteError('')
    setInviteLoading(true)
    try {
      const res = await fetch('/api/validate-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inviteCode }),
      })
      const data = await res.json()
      if (data.valid) {
        setStep('register')
      } else {
        setInviteError(data.error || 'Invalid invite code')
      }
    } catch {
      setInviteError('Something went wrong. Please try again.')
    } finally {
      setInviteLoading(false)
    }
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setFormLoading(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          invite_code: inviteCode,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setStep('success')
      } else {
        setFormError(data.error || 'Something went wrong.')
      }
    } catch {
      setFormError('Something went wrong. Please try again.')
    } finally {
      setFormLoading(false)
    }
  }

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'DM Sans', sans-serif;
          background: #0B1F3A;
          color: #E8EDF5;
          min-height: 100vh;
        }

        .page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2.5rem 1.25rem;
        }

        .header {
          width: 100%;
          max-width: 480px;
          margin-bottom: 2rem;
        }

        .product-name {
          font-family: 'DM Serif Display', serif;
          font-size: 2rem;
          color: #E8EDF5;
          letter-spacing: -0.03em;
          line-height: 1;
          margin-bottom: 0.5rem;
        }

        .product-tagline {
          font-size: 0.9rem;
          color: #93B4D4;
          font-weight: 400;
          line-height: 1.5;
          font-style: italic;
        }

        .product-copy {
          font-size: 0.82rem;
          color: #6B8FAD;
          font-weight: 400;
          line-height: 1.65;
          margin-top: 0.875rem;
          max-width: 440px;
        }

        .provider {
          font-size: 0.68rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #2A4A6B;
          font-weight: 500;
          margin-top: 1rem;
        }

        .provider span {
          font-family: 'DM Serif Display', serif;
          letter-spacing: 0;
          text-transform: none;
          font-size: 0.75rem;
          color: #3D6080;
        }

        .card {
          width: 100%;
          max-width: 480px;
          background: #071629;
          border: 1px solid #152840;
          border-radius: 10px;
          padding: 2.25rem 2.5rem;
        }

        .step-indicator {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          margin-bottom: 1.75rem;
        }

        .step-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #1A2E47;
          transition: all 0.3s ease;
        }

        .step-dot.active {
          background: #2563EB;
          width: 20px;
          border-radius: 3px;
        }

        .step-dot.done {
          background: #2563EB;
          opacity: 0.35;
        }

        .form-heading {
          font-family: 'DM Serif Display', serif;
          font-size: 1.5rem;
          color: #E8EDF5;
          letter-spacing: -0.02em;
          margin-bottom: 0.375rem;
          line-height: 1.2;
        }

        .form-subheading {
          font-size: 0.82rem;
          color: #6B8FAD;
          font-weight: 400;
          margin-bottom: 1.75rem;
          line-height: 1.55;
        }

        .field {
          margin-bottom: 1rem;
        }

        .field label {
          display: block;
          font-size: 0.68rem;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: #6B8FAD;
          font-weight: 500;
          margin-bottom: 0.4rem;
        }

        .field input,
        .field select {
          width: 100%;
          background: #0B1F3A;
          border: 1px solid #1A2E47;
          border-radius: 6px;
          padding: 0.675rem 0.875rem;
          font-size: 0.875rem;
          color: #E8EDF5;
          font-family: 'DM Sans', sans-serif;
          font-weight: 400;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          appearance: none;
          -webkit-appearance: none;
        }

        .field input::placeholder { color: #243548; }

        .field input:focus,
        .field select:focus {
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        }

        .field-hint {
          font-size: 0.68rem;
          color: #4A6680;
          margin-top: 0.35rem;
        }

        .field-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.875rem;
        }

        .invite-field input {
          font-size: 1rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 0.875rem 1rem;
        }

        .select-wrapper { position: relative; }

        .select-wrapper::after {
          content: '';
          position: absolute;
          right: 0.875rem;
          top: 50%;
          transform: translateY(-50%);
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top: 4px solid #4A6680;
          pointer-events: none;
        }

        .select-wrapper select option { background: #0B1F3A; }

        hr {
          border: none;
          border-top: 1px solid #0F2030;
          margin: 1.25rem 0;
        }

        .btn {
          width: 100%;
          padding: 0.75rem;
          background: #2563EB;
          color: #fff;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-family: 'DM Sans', sans-serif;
          font-weight: 500;
          cursor: pointer;
          letter-spacing: 0.01em;
          transition: background 0.15s ease;
          margin-top: 0.5rem;
        }

        .btn:hover:not(:disabled) { background: #1D4FBF; }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .error-banner {
          background: rgba(220,38,38,0.07);
          border: 1px solid rgba(220,38,38,0.2);
          border-radius: 6px;
          padding: 0.675rem 0.875rem;
          font-size: 0.8rem;
          color: #F87171;
          margin-bottom: 1.25rem;
          line-height: 1.5;
        }

        .success-icon {
          width: 40px;
          height: 40px;
          background: rgba(37,99,235,0.1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.25rem;
        }

        .success-icon svg {
          width: 18px;
          height: 18px;
          stroke: #2563EB;
          fill: none;
          stroke-width: 2.5;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .success-note {
          background: #0B1F3A;
          border: 1px solid #1A2E47;
          border-radius: 6px;
          padding: 0.875rem 1rem;
          font-size: 0.78rem;
          color: #6B8FAD;
          line-height: 1.6;
          margin-top: 1.5rem;
        }

        .footer {
          width: 100%;
          max-width: 480px;
          margin-top: 1.5rem;
          font-size: 0.68rem;
          color: #2A4A6B;
          text-align: center;
        }

        @media (max-width: 540px) {
          .card { padding: 1.75rem 1.25rem; }
          .field-row { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="page">

        <div className="header">
          <div className="product-name">Novation</div>
          <div className="product-tagline">Every book of business, in the right hands.</div>
          <div className="product-copy">
            Novation connects Canadian advisors with qualified successors — so the relationships built land in the right hands.
          </div>
          <div className="provider">A product by <span>Klarum</span></div>
        </div>

        <div className="card">

          {step !== 'success' && (
            <div className="step-indicator">
              <div className={`step-dot ${step === 'invite' ? 'active' : 'done'}`} />
              <div className={`step-dot ${step === 'register' ? 'active' : ''}`} />
            </div>
          )}

          {step === 'invite' && (
            <form onSubmit={handleInviteSubmit}>
              <div className="form-heading">Enter your invite code</div>
              <div className="form-subheading">
                Novation is currently available by invitation only.
              </div>

              {inviteError && <div className="error-banner">{inviteError}</div>}

              <div className="field invite-field">
                <label>Invite Code</label>
                <input
                  type="text"
                  placeholder="KLARUM-XXXX-XXX"
                  value={inviteCode}
                  onChange={e => {
                    setInviteCode(e.target.value)
                    setInviteError('')
                  }}
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              <button className="btn" type="submit" disabled={inviteLoading || !inviteCode.trim()}>
                {inviteLoading ? 'Checking\u2026' : 'Continue'}
              </button>
            </form>
          )}

          {step === 'register' && (
            <form onSubmit={handleRegisterSubmit}>
              <div className="form-heading">Create your profile</div>
              <div className="form-subheading">
                Tell us a bit about yourself to get started.
              </div>

              {formError && <div className="error-banner">{formError}</div>}

              <div className="field">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="Jane Smith"
                  value={form.full_name}
                  onChange={e => updateField('full_name', e.target.value)}
                  autoComplete="name"
                />
              </div>

              <div className="field">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="jane@example.com"
                  value={form.email}
                  onChange={e => updateField('email', e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="field">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={e => updateField('password', e.target.value)}
                  autoComplete="new-password"
                />
                <div className="field-hint">At least 8 characters, one uppercase letter, one number</div>
              </div>

              <hr />

              <div className="field-row">
                <div className="field">
                  <label>Phone</label>
                  <input
                    type="tel"
                    placeholder="4161234567"
                    value={form.phone}
                    onChange={e => updateField('phone', e.target.value.replace(/\D/g, ''))}
                    maxLength={10}
                    autoComplete="tel"
                  />
                  <div className="field-hint">10 digits, no spaces</div>
                </div>

                <div className="field">
                  <label>Years in Practice</label>
                  <input
                    type="number"
                    placeholder="0"
                    min={0}
                    max={60}
                    value={form.years_in_practice}
                    onChange={e => updateField('years_in_practice', e.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <label>Province or Territory</label>
                <div className="select-wrapper">
                  <select
                    value={form.province}
                    onChange={e => updateField('province', e.target.value)}
                  >
                    <option value="">Select\u2026</option>
                    {PROVINCES.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                className="btn"
                type="submit"
                disabled={
                  formLoading ||
                  !form.full_name ||
                  !form.email ||
                  !form.password ||
                  !form.phone ||
                  !form.province ||
                  !form.years_in_practice
                }
              >
                {formLoading ? 'Creating your profile\u2026' : 'Create Account'}
              </button>
            </form>
          )}

          {step === 'success' && (
            <div>
              <div className="success-icon">
                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <div className="form-heading">You're in.</div>
              <div className="form-subheading">
                Your Novation profile has been created. Check your email to verify your address before signing in.
              </div>
              <div className="success-note">
                Didn't receive an email? Check your spam folder, or contact us at hello@klarum.ca
              </div>
            </div>
          )}

        </div>

        <div className="footer">
          &copy; {new Date().getFullYear()} Klarum Inc. &middot; Early Access
        </div>

      </div>
    </>
  )
}