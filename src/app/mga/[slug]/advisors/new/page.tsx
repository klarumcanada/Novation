'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

const PROVINCES = [
  'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'
]

export default function NewAdvisorPage() {
  const params = useParams()
  const slug = params.slug as string
  const router = useRouter()

  const [form, setForm] = useState({
    entity_type: 'individual',
    first_name: '',
    last_name: '',
    corporation_name: '',
    email: '',
    phone: '',
    province: '',
    years_in_practice: '',
    external_id: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const isCorporation = form.entity_type === 'corporation'
    const full_name = isCorporation
      ? form.corporation_name.trim()
      : `${form.first_name.trim()} ${form.last_name.trim()}`.trim()

    const { data: mga } = await supabase
      .from('mgas')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!mga) {
      setError('MGA not found.')
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    const { error: insertError } = await supabase
      .from('mga_advisors')
      .insert({
        mga_id: mga.id,
        full_name,
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        province: form.province || null,
        years_in_practice: form.years_in_practice ? parseInt(form.years_in_practice) : null,
        external_id: form.external_id.trim() || null,
        entity_type: form.entity_type,
        corporation_name: isCorporation ? (form.corporation_name.trim() || null) : null,
        imported_by: user?.id,
        status: 'pending',
      })

    if (insertError) {
      setError(
        insertError.code === '23505'
          ? 'An advisor with this email or external ID already exists.'
          : insertError.message
      )
      setLoading(false)
      return
    }

    router.push(`/mga/${slug}/advisors`)
  }

  const isCorporation = form.entity_type === 'corporation'

  return (
    <main className="mga-page">
      <div className="mga-page-header-row">
        <div>
          <h1 className="mga-page-title">Add advisor</h1>
          <p className="mga-page-sub">
            Advisor will be added to the holding area. Release them when ready to send an invite.
          </p>
        </div>
        <Link href={`/mga/${slug}/advisors`} className="mga-btn mga-btn--secondary">
          ← Back
        </Link>
      </div>

      <div className="mga-form-card">
        {error && (
          <div className="mga-alert mga-alert--error" style={{ marginBottom: '24px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mga-form-grid">
            <div className="mga-form-field">
              <label className="mga-form-label">Entity type</label>
              <div style={{ display: 'flex', gap: '24px', marginTop: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 400 }}>
                  <input
                    type="radio"
                    name="entity_type"
                    value="individual"
                    checked={!isCorporation}
                    onChange={handleChange}
                  />
                  Individual
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 400 }}>
                  <input
                    type="radio"
                    name="entity_type"
                    value="corporation"
                    checked={isCorporation}
                    onChange={handleChange}
                  />
                  Corporation
                </label>
              </div>
            </div>

            {isCorporation ? (
              <div className="mga-form-field">
                <label className="mga-form-label">Corporation name *</label>
                <input
                  className="mga-form-input"
                  name="corporation_name"
                  value={form.corporation_name}
                  onChange={handleChange}
                  placeholder="Smith Financial Corp."
                  required
                />
              </div>
            ) : (
              <>
                <div className="mga-form-field">
                  <label className="mga-form-label">First name *</label>
                  <input
                    className="mga-form-input"
                    name="first_name"
                    value={form.first_name}
                    onChange={handleChange}
                    placeholder="Jane"
                    required
                  />
                </div>

                <div className="mga-form-field">
                  <label className="mga-form-label">Last name *</label>
                  <input
                    className="mga-form-input"
                    name="last_name"
                    value={form.last_name}
                    onChange={handleChange}
                    placeholder="Smith"
                    required
                  />
                </div>
              </>
            )}

            <div className="mga-form-field">
              <label className="mga-form-label">Email *</label>
              <input
                className="mga-form-input"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="jane@example.com"
                required
              />
            </div>

            <div className="mga-form-field">
              <label className="mga-form-label">Phone</label>
              <input
                className="mga-form-input"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="416-555-0100"
              />
            </div>

            <div className="mga-form-field">
              <label className="mga-form-label">Province</label>
              <select
                className="mga-form-select"
                name="province"
                value={form.province}
                onChange={handleChange}
              >
                <option value="">Select province</option>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="mga-form-field">
              <label className="mga-form-label">Years in practice</label>
              <input
                className="mga-form-input"
                name="years_in_practice"
                type="number"
                min="0"
                max="60"
                value={form.years_in_practice}
                onChange={handleChange}
                placeholder="12"
              />
            </div>

            <div className="mga-form-field">
              <label className="mga-form-label">External ID</label>
              <div className="mga-form-hint">Your backoffice identifier for this advisor</div>
              <input
                className="mga-form-input"
                name="external_id"
                value={form.external_id}
                onChange={handleChange}
                placeholder="ADV-00123"
              />
            </div>
          </div>

          <div className="mga-form-actions">
            <button
              type="submit"
              className="mga-btn mga-btn--primary"
              disabled={loading}
            >
              {loading ? 'Saving…' : 'Add to holding area'}
            </button>
            <Link href={`/mga/${slug}/advisors`} className="mga-btn mga-btn--ghost">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  )
}
