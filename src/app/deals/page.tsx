'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import NovationNav from '@/components/NovationNav'

const BRAND = {
  midnight: '#0D1B3E',
  electric: '#3B82F6',
  chalk: '#F0EDE7',
  ice: '#DBEAFE',
  navy: '#1A3266',
  voltage: '#E8C547',
}

const STAGES = [
  'interested',
  'valuation_pending',
  'valuation_shared',
  'loi',
  'due_diligence',
  'client_communication',
  'book_transfer',
  'closed',
] as const
type Stage = typeof STAGES[number]

const STAGE_LABELS: Record<Stage, string> = {
  interested:             'Interested',
  valuation_pending:      'Valuation Pending',
  valuation_shared:       'Valuation Shared',
  loi:                    'Letter of Intent',
  due_diligence:          'Due Diligence',
  client_communication:   'Client Communication',
  book_transfer:          'Book Transfer',
  closed:                 'Closed',
}

type Valuation = {
  id: string
  low_value: number | null
  high_value: number | null
  breakdown: Record<string, {
    revenue: number
    multiple_low: number
    multiple_high: number
    value_low: number
    value_high: number
  }> | null
  persistency_rate: number | null
  transition_factor: number | null
  total_policies: number | null
  active_policies: number | null
  shared_with_buyer: boolean
  calculated_at: string
  source: 'novation' | 'manual' | 'uploaded'
  valuation_method: string | null
  prepared_by: string | null
  notes: string | null
  effective_date: string | null
  document_url: string | null
  mga_doc_consent: boolean
}

type Deal = {
  id: string
  status: Stage
  seller: { id: string; full_name: string }
  buyer: { id: string; full_name: string }
  is_seller: boolean
  is_initiator: boolean
  my_confirmed: boolean
  their_confirmed: boolean
  thread_id: string | null
  created_at: string
  updated_at: string
}

type ValuationPath = 'novation' | 'manual' | 'uploaded' | null

const SOURCE_BADGE: Record<'novation' | 'manual' | 'uploaded', { label: string; bg: string; color: string; border: string }> = {
  novation: { label: 'Novation calculated', bg: '#DBEAFE', color: '#1A3266', border: '#BFDBFE' },
  manual:   { label: 'Manual entry',        bg: '#F3F4F6', color: '#374151', border: '#E5E7EB' },
  uploaded: { label: 'External report',     bg: '#FEF9EC', color: '#92400E', border: '#FDE68A' },
}

function formatMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toLocaleString()}`
}

function SourceBadge({ source }: { source: 'novation' | 'manual' | 'uploaded' }) {
  const b = SOURCE_BADGE[source]
  return (
    <span style={{
      fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600,
      padding: '3px 10px', borderRadius: '100px',
      background: b.bg, color: b.color, border: `1px solid ${b.border}`,
    }}>
      {b.label}
    </span>
  )
}

function StageTrack({ status }: { status: Stage }) {
  const current = STAGES.indexOf(status)
  return (
    <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, margin: '1rem 0', minWidth: '600px' }}>
        {STAGES.map((stage, i) => {
          const done = i < current
          const active = i === current
          return (
            <div key={stage} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: 700, fontFamily: 'DM Sans, sans-serif',
                  background: done ? BRAND.electric : active ? BRAND.midnight : '#E5E7EB',
                  color: done || active ? 'white' : '#9CA3AF',
                  border: active ? `2px solid ${BRAND.electric}` : 'none',
                  transition: 'all .2s',
                }}>
                  {done ? '✓' : i + 1}
                </div>
                <span style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: '9px', marginTop: '4px',
                  color: active ? BRAND.midnight : done ? BRAND.electric : '#9CA3AF',
                  fontWeight: active ? 600 : 400, textAlign: 'center', whiteSpace: 'nowrap',
                }}>
                  {STAGE_LABELS[stage]}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div style={{
                  height: '2px', flex: 1, marginBottom: '18px',
                  background: done ? BRAND.electric : '#E5E7EB',
                  transition: 'all .2s',
                }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ValuationCard({
  dealId,
  buyerFirstName,
  onShared,
}: {
  dealId: string
  buyerFirstName: string
  onShared: () => void
}) {
  const router = useRouter()
  const [valuation, setValuation] = useState<Valuation | null>(null)
  const [loadingInit, setLoadingInit] = useState(true)
  const [loading, setLoading] = useState(false)
  const [path, setPath] = useState<ValuationPath>(null)
  const [sharing, setSharing] = useState(false)

  const [manualLow, setManualLow] = useState('')
  const [manualHigh, setManualHigh] = useState('')
  const [manualMethod, setManualMethod] = useState('')
  const [manualPreparedBy, setManualPreparedBy] = useState('')
  const [manualNotes, setManualNotes] = useState('')
  const [manualEffective, setManualEffective] = useState('')
  const [manualError, setManualError] = useState('')

  const [file, setFile] = useState<File | null>(null)
  const [uploadLow, setUploadLow] = useState('')
  const [uploadHigh, setUploadHigh] = useState('')
  const [uploadPreparedBy, setUploadPreparedBy] = useState('')
  const [uploadEffective, setUploadEffective] = useState('')
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const [togglingConsent, setTogglingConsent] = useState(false)

  useEffect(() => {
    fetch('/api/valuations')
      .then(r => r.json())
      .then(data => { if (data) setValuation(data) })
      .finally(() => setLoadingInit(false))
  }, [])

  async function runValuation() {
    setLoading(true)
    const res = await fetch('/api/valuations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deal_id: dealId, source: 'novation' }),
    })
    const data = await res.json()
    if (res.ok) setValuation(data.valuation)
    setLoading(false)
    setPath(null)
  }

  async function submitManual() {
    setManualError('')
    const low = parseFloat(manualLow.replace(/[,$]/g, ''))
    const high = parseFloat(manualHigh.replace(/[,$]/g, ''))
    if (isNaN(low) || low <= 0 || isNaN(high) || high <= 0) { setManualError('Enter valid low and high values.'); return }
    if (high < low) { setManualError('High must be ≥ low.'); return }
    setLoading(true)
    const res = await fetch('/api/valuations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deal_id: dealId, source: 'manual',
        low_value: low, high_value: high,
        valuation_method: manualMethod || null,
        prepared_by: manualPreparedBy || null,
        notes: manualNotes || null,
        effective_date: manualEffective || null,
      }),
    })
    const data = await res.json()
    if (res.ok) setValuation(data.valuation)
    setLoading(false)
    setPath(null)
  }

  async function submitUpload() {
    setUploadError('')
    if (!file) { setUploadError('Select a PDF to upload.'); return }
    if (file.type !== 'application/pdf') { setUploadError('PDF files only.'); return }
    if (file.size > 10 * 1024 * 1024) { setUploadError('File must be under 10 MB.'); return }
    setLoading(true)
    const signRes = await fetch('/api/valuations/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deal_id: dealId, filename: file.name }),
    })
    const { upload_url, document_url } = await signRes.json()
    await fetch(upload_url, { method: 'PUT', body: file, headers: { 'Content-Type': 'application/pdf' } })
    const low = uploadLow ? parseFloat(uploadLow.replace(/[,$]/g, '')) : null
    const high = uploadHigh ? parseFloat(uploadHigh.replace(/[,$]/g, '')) : null
    const res = await fetch('/api/valuations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deal_id: dealId, source: 'uploaded',
        low_value: low, high_value: high,
        prepared_by: uploadPreparedBy || null,
        effective_date: uploadEffective || null,
        document_url,
      }),
    })
    const data = await res.json()
    if (res.ok) setValuation(data.valuation)
    setLoading(false)
    setPath(null)
  }

  async function shareAndAdvance() {
    if (!valuation) return
    setSharing(true)
    await fetch('/api/valuations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valuation_id: valuation.id, shared_with_buyer: true }),
    })
    const res = await fetch(`/api/deals/${dealId}/share-valuation`, { method: 'POST' })
    if (res.ok) {
      setValuation(v => v ? { ...v, shared_with_buyer: true } : v)
      onShared()
    }
    setSharing(false)
  }

  async function toggleMgaConsent() {
    if (!valuation) return
    setTogglingConsent(true)
    const res = await fetch('/api/valuations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valuation_id: valuation.id, mga_doc_consent: !valuation.mga_doc_consent }),
    })
    const data = await res.json()
    if (res.ok) setValuation(data.valuation)
    setTogglingConsent(false)
  }

  if (loadingInit) return (
    <div style={{ borderTop: '1px solid #F3F4F6', padding: '1.25rem 1.5rem', background: '#FAFAFA' }}>
      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#9CA3AF', margin: 0 }}>Loading…</p>
    </div>
  )

  return (
    <div style={{ borderTop: '1px solid #F3F4F6', padding: '1.25rem 1.5rem', background: '#FAFAFA' }}>
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
        Book Value Assessment
      </div>

      {loading ? (
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#9CA3AF', margin: 0 }}>
          {path === 'uploaded' ? 'Uploading…' : 'Saving…'}
        </p>

      ) : valuation ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                {valuation.low_value && valuation.high_value ? (
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 600, color: BRAND.midnight }}>
                    {formatMoney(valuation.low_value)} – {formatMoney(valuation.high_value)}
                  </span>
                ) : (
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', fontWeight: 600, color: BRAND.midnight }}>See uploaded report</span>
                )}
                <SourceBadge source={valuation.source} />
              </div>
              {valuation.source === 'novation' && valuation.active_policies != null && (
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#9CA3AF' }}>
                  {valuation.active_policies} active / {valuation.total_policies} total · {Math.round((valuation.persistency_rate ?? 0) * 100)}% persistency
                  {(valuation.transition_factor ?? 0) > 0 && ' · Stay-on premium applied'}
                </div>
              )}
              {valuation.prepared_by && (
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#9CA3AF' }}>
                  Prepared by {valuation.prepared_by}
                  {valuation.effective_date && ` · ${new Date(valuation.effective_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {valuation.source === 'novation' && (
              <button
                onClick={() => router.push('/valuation/report')}
                style={{ padding: '7px 14px', fontSize: '12px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', border: `1.5px solid ${BRAND.electric}`, background: 'white', color: BRAND.electric, cursor: 'pointer' }}
              >
                View Full Report →
              </button>
            )}
            {valuation.source === 'uploaded' && valuation.document_url && (
              <a
                href={valuation.document_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ padding: '7px 14px', fontSize: '12px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', border: `1.5px solid ${BRAND.electric}`, background: 'white', color: BRAND.electric, cursor: 'pointer', textDecoration: 'none' }}
              >
                View uploaded report →
              </a>
            )}
            {!valuation.shared_with_buyer && (
              <button
                onClick={() => { setValuation(null); setPath(null) }}
                style={{ padding: '7px 14px', fontSize: '12px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', border: '1.5px solid #E2E6F0', background: 'white', color: '#9CA3AF', cursor: 'pointer' }}
              >
                Replace
              </button>
            )}
          </div>

          {valuation.source === 'uploaded' && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 12px', borderRadius: '8px', marginBottom: '12px',
              background: valuation.mga_doc_consent ? '#F0FDF4' : '#FAFAFA',
              border: `1px solid ${valuation.mga_doc_consent ? '#BBF7D0' : '#E5E7EB'}`,
            }}>
              <div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600, color: BRAND.midnight }}>Share document with MGA</div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                  {valuation.mga_doc_consent ? 'Your MGA can view this uploaded report.' : 'Your MGA cannot currently view this document.'}
                </div>
              </div>
              <button
                onClick={toggleMgaConsent}
                disabled={togglingConsent}
                aria-label="Toggle MGA document sharing"
                style={{
                  width: '40px', height: '22px', borderRadius: '100px', border: 'none', cursor: 'pointer',
                  background: valuation.mga_doc_consent ? BRAND.electric : '#D1D5DB',
                  position: 'relative', transition: 'background .2s', flexShrink: 0,
                }}
              >
                <div style={{
                  position: 'absolute', top: '3px',
                  left: valuation.mga_doc_consent ? '21px' : '3px',
                  width: '16px', height: '16px', borderRadius: '50%', background: 'white',
                  transition: 'left .2s',
                }} />
              </button>
            </div>
          )}

          {!valuation.shared_with_buyer ? (
            <div style={{
              background: BRAND.ice, border: `1.5px solid ${BRAND.electric}`,
              borderRadius: '10px', padding: '1rem',
            }}>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: BRAND.midnight, marginBottom: '4px' }}>
                Ready to share with {buyerFirstName}?
              </div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#374151', lineHeight: 1.65, margin: '0 0 12px' }}>
                Sharing your valuation will notify {buyerFirstName} and move this deal to LOI review. You won't be able to replace the valuation after sharing.
              </p>
              <button
                onClick={shareAndAdvance}
                disabled={sharing}
                style={{ padding: '9px 18px', fontSize: '13px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', border: 'none', background: BRAND.midnight, color: 'white', cursor: sharing ? 'not-allowed' : 'pointer' }}
              >
                {sharing ? 'Sharing…' : `Share with ${buyerFirstName} and move to LOI review →`}
              </button>
            </div>
          ) : (
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#065F46', background: '#D1FAE5', border: '1px solid #6EE7B7', borderRadius: '8px', padding: '8px 12px', display: 'inline-block' }}>
              ✓ Shared with {buyerFirstName} · Waiting for them to confirm LOI
            </div>
          )}

          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#9CA3AF', marginTop: '10px' }}>
            {valuation.source === 'novation' ? 'Indicative only · ' : ''}
            {valuation.notes ? `${valuation.notes} · ` : ''}
            Added {new Date(valuation.calculated_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>

      ) : (
        <div>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#374151', margin: '0 0 10px', lineHeight: 1.65 }}>
            How would you like to establish your book value?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {([
              { key: 'novation' as ValuationPath, label: 'Use Novation tool', sub: 'Authorize your MGA to share policy data for an indicative range' },
              { key: 'manual'   as ValuationPath, label: 'Enter manually',    sub: 'Provide your own valuation range and methodology' },
              { key: 'uploaded' as ValuationPath, label: 'Upload report',     sub: 'Attach a valuation report prepared by a third party (PDF)' },
            ]).map(opt => (
              <button
                key={opt.key!}
                onClick={() => setPath(opt.key)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left',
                  padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                  border: `1.5px solid ${path === opt.key ? BRAND.electric : '#E2E6F0'}`,
                  background: path === opt.key ? BRAND.ice : 'white',
                  transition: 'all .15s',
                }}
              >
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: BRAND.midnight }}>{opt.label}</span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>{opt.sub}</span>
              </button>
            ))}
          </div>

          {path === 'novation' && (
            <div style={{ background: 'white', border: `1.5px solid ${BRAND.electric}`, borderRadius: '10px', padding: '1rem', marginTop: '12px' }}>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: BRAND.midnight, marginBottom: '6px' }}>Authorize data share</div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#374151', lineHeight: 1.65, margin: '0 0 12px' }}>
                By proceeding, you authorize your MGA to share your in-force policy data with Klarum Novation solely for the purpose of calculating your book value. This data will not be shared with {buyerFirstName} without your explicit consent.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={runValuation} style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', border: 'none', background: BRAND.midnight, color: 'white', cursor: 'pointer' }}>
                  I authorize — run calculation
                </button>
                <button onClick={() => setPath(null)} style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', border: '1px solid #E2E6F0', background: 'white', color: '#6B7280', cursor: 'pointer' }}>
                  Back
                </button>
              </div>
            </div>
          )}

          {path === 'manual' && (
            <div style={{ background: 'white', border: '1.5px solid #E2E6F0', borderRadius: '10px', padding: '1rem', marginTop: '12px' }}>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: BRAND.midnight, marginBottom: '12px' }}>Manual valuation entry</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                {[
                  { label: 'Low value (CAD)', val: manualLow, set: setManualLow },
                  { label: 'High value (CAD)', val: manualHigh, set: setManualHigh },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '4px' }}>{f.label}</label>
                    <input value={f.val} onChange={e => f.set(e.target.value)} placeholder="$0"
                      style={{ width: '100%', padding: '8px 10px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', border: '1px solid #E2E6F0', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
              {[
                { label: 'Valuation method', val: manualMethod,     set: setManualMethod,     placeholder: 'e.g. Revenue multiple, EBITDA', type: 'text' },
                { label: 'Prepared by',      val: manualPreparedBy, set: setManualPreparedBy, placeholder: 'e.g. Your name or firm',        type: 'text' },
                { label: 'Effective date',   val: manualEffective,  set: setManualEffective,  placeholder: '',                              type: 'date' },
              ].map(f => (
                <div key={f.label} style={{ marginBottom: '10px' }}>
                  <label style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '4px' }}>{f.label}</label>
                  <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} type={f.type}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', border: '1px solid #E2E6F0', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '4px' }}>Notes (optional)</label>
                <textarea value={manualNotes} onChange={e => setManualNotes(e.target.value)} rows={2} placeholder="Any context or caveats…"
                  style={{ width: '100%', padding: '8px 10px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', border: '1px solid #E2E6F0', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              {manualError && <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#DC2626', margin: '0 0 10px' }}>{manualError}</p>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={submitManual} style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', border: 'none', background: BRAND.midnight, color: 'white', cursor: 'pointer' }}>
                  Save valuation
                </button>
                <button onClick={() => setPath(null)} style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', border: '1px solid #E2E6F0', background: 'white', color: '#6B7280', cursor: 'pointer' }}>
                  Back
                </button>
              </div>
            </div>
          )}

          {path === 'uploaded' && (
            <div style={{ background: 'white', border: '1.5px solid #E2E6F0', borderRadius: '10px', padding: '1rem', marginTop: '12px' }}>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: BRAND.midnight, marginBottom: '12px' }}>Upload valuation report</div>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${file ? BRAND.electric : '#E2E6F0'}`,
                  borderRadius: '10px', padding: '20px', textAlign: 'center', cursor: 'pointer',
                  background: file ? BRAND.ice : '#FAFAFA', marginBottom: '12px', transition: 'all .15s',
                }}
              >
                <input ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }}
                  onChange={e => setFile(e.target.files?.[0] ?? null)} />
                {file ? (
                  <div>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: BRAND.navy }}>📄 {file.name}</div>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>{(file.size / 1024).toFixed(0)} KB</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#9CA3AF' }}>Click to select PDF</div>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#D1D5DB', marginTop: '2px' }}>Max 10 MB</div>
                  </div>
                )}
              </div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#9CA3AF', margin: '0 0 12px', lineHeight: 1.5 }}>
                Optionally enter the value range from the report — if left blank the deal will show "See report" instead of a dollar range.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                {[
                  { label: 'Low value (CAD, optional)', val: uploadLow, set: setUploadLow },
                  { label: 'High value (CAD, optional)', val: uploadHigh, set: setUploadHigh },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '4px' }}>{f.label}</label>
                    <input value={f.val} onChange={e => f.set(e.target.value)} placeholder="$0"
                      style={{ width: '100%', padding: '8px 10px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', border: '1px solid #E2E6F0', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
              {[
                { label: 'Prepared by', val: uploadPreparedBy, set: setUploadPreparedBy, placeholder: 'e.g. Firm name', type: 'text' },
                { label: 'Report date', val: uploadEffective,  set: setUploadEffective,  placeholder: '', type: 'date' },
              ].map(f => (
                <div key={f.label} style={{ marginBottom: '10px' }}>
                  <label style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '4px' }}>{f.label}</label>
                  <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} type={f.type}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', border: '1px solid #E2E6F0', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              {uploadError && <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#DC2626', margin: '0 0 10px' }}>{uploadError}</p>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={submitUpload} style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', border: 'none', background: BRAND.midnight, color: 'white', cursor: 'pointer' }}>
                  Upload &amp; save
                </button>
                <button onClick={() => setPath(null)} style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', border: '1px solid #E2E6F0', background: 'white', color: '#6B7280', cursor: 'pointer' }}>
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ConfirmPill({ label, confirmed }: { label: string; confirmed: boolean }) {
  return (
    <span style={{
      fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 500,
      padding: '3px 10px', borderRadius: '100px',
      background: confirmed ? '#D1FAE5' : '#F3F4F6',
      color: confirmed ? '#065F46' : '#9CA3AF',
      border: `1px solid ${confirmed ? '#6EE7B7' : '#E5E7EB'}`,
    }}>
      {confirmed ? `✓ ${label}` : `${label} — pending`}
    </span>
  )
}

export default function DealsPage() {
  const router = useRouter()
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/deals')
      .then(r => r.json())
      .then(data => { setDeals(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleConfirm(dealId: string) {
    setConfirming(dealId)
    const res = await fetch(`/api/deals/${dealId}/confirm`, { method: 'POST' })
    const data = await res.json()
    setConfirming(null)
    if (res.ok) {
      setDeals(prev => prev.map(d => d.id === dealId ? {
        ...d,
        status: data.deal.status,
        my_confirmed: data.advanced ? false : true,
        their_confirmed: data.advanced ? false : d.their_confirmed,
      } : d))
    }
  }

  function handleValuationShared(dealId: string) {
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, status: 'valuation_shared' } : d))
  }

  function renderActions(deal: Deal) {
    const other = deal.is_seller ? deal.buyer : deal.seller
    const otherFirst = other.full_name.split(' ')[0]

    if (deal.status === 'interested') {
      if (deal.is_initiator) {
        return (
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#9CA3AF', margin: 0 }}>
            Waiting for {otherFirst} to confirm interest…
          </p>
        )
      }
      return (
        <button
          onClick={() => handleConfirm(deal.id)}
          disabled={confirming === deal.id}
          style={{ padding: '9px 18px', fontSize: '13px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', border: 'none', background: BRAND.midnight, color: 'white', cursor: confirming === deal.id ? 'not-allowed' : 'pointer' }}
        >
          {confirming === deal.id ? 'Confirming…' : 'Confirm interest'}
        </button>
      )
    }

    if (deal.status === 'valuation_pending') {
      if (!deal.is_seller) {
        return (
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#9CA3AF', margin: 0 }}>
            Waiting for {otherFirst} to complete their valuation…
          </p>
        )
      }
      return null // ValuationCard below handles seller UI
    }

    if (deal.status === 'valuation_shared') {
      if (deal.is_seller) {
        return (
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#9CA3AF', margin: 0 }}>
            Valuation shared · Waiting for {otherFirst} to confirm LOI…
          </p>
        )
      }
      return (
        <button
          onClick={() => handleConfirm(deal.id)}
          disabled={confirming === deal.id}
          style={{ padding: '9px 18px', fontSize: '13px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', border: 'none', background: BRAND.midnight, color: 'white', cursor: confirming === deal.id ? 'not-allowed' : 'pointer' }}
        >
          {confirming === deal.id ? 'Confirming…' : 'Review valuation and move to LOI →'}
        </button>
      )
    }

    // ── LOI stage: both parties go into the LOI signing flow ──────────────────
    if (deal.status === 'loi') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{
            background: BRAND.ice,
            border: `1.5px solid ${BRAND.electric}`,
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: BRAND.midnight, marginBottom: '2px' }}>
                Letter of Intent ready to sign
              </div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#374151' }}>
                Review, edit if needed, and sign the LOI to proceed to due diligence.
              </div>
            </div>
            <button
              onClick={() => router.push(`/deals/${deal.id}/loi`)}
              style={{
                padding: '9px 20px',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: 'DM Sans, sans-serif',
                borderRadius: '8px',
                border: 'none',
                background: BRAND.midnight,
                color: 'white',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              📄 Open LOI →
            </button>
          </div>
        </div>
      )
    }

    // ── Stages after LOI: generic mutual confirm flow ─────────────────────────
    if (['due_diligence', 'client_communication', 'book_transfer'].includes(deal.status)) {
      const NEXT_LABELS: Partial<Record<Stage, string>> = {
        due_diligence:        'Client Communication',
        client_communication: 'Book Transfer',
        book_transfer:        'Closed',
      }
      const nextLabel = NEXT_LABELS[deal.status]
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <ConfirmPill label="You" confirmed={deal.my_confirmed} />
            <ConfirmPill label={otherFirst} confirmed={deal.their_confirmed} />
          </div>
          {!deal.my_confirmed ? (
            <button
              onClick={() => handleConfirm(deal.id)}
              disabled={confirming === deal.id}
              style={{ padding: '9px 18px', fontSize: '13px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', borderRadius: '8px', border: 'none', background: BRAND.midnight, color: 'white', cursor: confirming === deal.id ? 'not-allowed' : 'pointer', alignSelf: 'flex-start' }}
            >
              {confirming === deal.id ? 'Confirming…' : `Confirm: Move to ${nextLabel}`}
            </button>
          ) : !deal.their_confirmed ? (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: BRAND.electric, margin: 0 }}>
              ✓ Waiting for {otherFirst} to confirm
            </p>
          ) : null}
        </div>
      )
    }

    return null
  }

  return (
    <div style={{ background: BRAND.chalk, minHeight: '100vh', paddingBottom: '4rem' }}>
      <NovationNav />
      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '26px', fontWeight: 600, color: BRAND.midnight, margin: '0 0 2rem 0' }}>
          My Deals
        </h1>

        {loading ? (
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF' }}>Loading…</p>
        ) : deals.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E6F0', padding: '3rem', textAlign: 'center' }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF', margin: 0 }}>
              No active deals yet. Express interest in a deal from a message thread to get started.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {deals.map(deal => {
              const other = deal.is_seller ? deal.buyer : deal.seller
              const isClosed = deal.status === 'closed'
              const showValuation = deal.is_seller && deal.status === 'valuation_pending'

              return (
                <div key={deal.id} style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E6F0', overflow: 'hidden' }}>
                  <div style={{ borderLeft: `4px solid ${BRAND.electric}`, padding: '1.25rem 1.5rem', borderBottom: '1px solid #F3F4F6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '17px', fontWeight: 600, color: BRAND.midnight, marginBottom: '2px' }}>
                          {deal.is_seller ? `Buyer: ${other.full_name}` : `Seller: ${other.full_name}`}
                        </div>
                        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#9CA3AF' }}>
                          Started {new Date(deal.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                      <span style={{
                        padding: '4px 10px', fontSize: '11px', fontFamily: 'DM Sans, sans-serif',
                        fontWeight: 600, borderRadius: '100px',
                        background: isClosed ? '#D1FAE5' : BRAND.ice,
                        color: isClosed ? '#065F46' : BRAND.navy,
                      }}>
                        {STAGE_LABELS[deal.status]}
                      </span>
                    </div>
                  </div>

                  <div style={{ padding: '0 1.5rem' }}>
                    <StageTrack status={deal.status} />
                  </div>

                  {!isClosed && (
                    <div style={{ padding: '0 1.5rem 1.5rem' }}>
                      {renderActions(deal)}
                      {deal.thread_id && (
                        <button
                          onClick={() => router.push(`/inbox/${deal.thread_id}`)}
                          style={{
                            marginTop: '10px', padding: '9px 18px', fontSize: '13px', fontWeight: 500,
                            fontFamily: 'DM Sans, sans-serif', borderRadius: '8px',
                            border: '1.5px solid #E2E6F0', background: 'white', color: '#6B7280',
                            cursor: 'pointer', display: 'block',
                          }}
                        >
                          View thread →
                        </button>
                      )}
                    </div>
                  )}

                  {showValuation && (
                    <ValuationCard
                      dealId={deal.id}
                      buyerFirstName={other.full_name.split(' ')[0]}
                      onShared={() => handleValuationShared(deal.id)}
                    />
                  )}

                  {isClosed && (
                    <div style={{ padding: '0 1.5rem 1.5rem' }}>
                      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B7280', margin: 0 }}>
                        This deal has been completed. 🎉
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}