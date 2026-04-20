'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'

// ── Constants ──────────────────────────────────────────────────────────────────

const BRAND = {
  midnight: '#0D1B3E',
  electric: '#3B82F6',
  chalk:    '#F0EDE7',
  border:   '#E2E6F0',
  stepNum:  '#C5CDE8',
}
const FONT = 'DM Sans, sans-serif'

const DISPLAY_STAGES = [
  { keys: ['interested'],                            label: 'Interest' },
  { keys: ['valuation_pending', 'valuation_shared'], label: 'Valuation' },
  { keys: ['loi'],                                   label: 'Letter of Intent' },
  { keys: ['due_diligence'],                         label: 'Due Diligence' },
  { keys: ['client_communication'],                  label: 'Client Comms' },
  { keys: ['book_transfer'],                         label: 'Book Transfer' },
  { keys: ['closed'],                                label: 'Complete' },
]

const STAGE_LABEL: Record<string, string> = {
  interested:           'Interest',
  valuation_pending:    'Valuation Pending',
  valuation_shared:     'Valuation Shared',
  loi:                  'Letter of Intent',
  due_diligence:        'Due Diligence',
  client_communication: 'Client Comms',
  book_transfer:        'Book Transfer',
  closed:               'Complete',
  canceled:             'Cancelled',
}

type Tab = 'Valuation' | 'Letter of Intent' | 'Due Diligence' | 'Client Communications' | 'Book Transfer' | 'Notes'
const TABS: Tab[] = ['Valuation', 'Letter of Intent', 'Due Diligence', 'Client Communications', 'Book Transfer', 'Notes']

function stageIndex(s: string) {
  return DISPLAY_STAGES.findIndex(d => d.keys.includes(s))
}

function fmtDate(iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-CA', opts ?? { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toLocaleString()}`
}

// ── Types ──────────────────────────────────────────────────────────────────────

type Deal = {
  id: string
  status: string
  created_at: string
  updated_at: string
  mga_id: string
  seller_id: string
  buyer_id: string
  seller_confirmed_next: boolean
  buyer_confirmed_next: boolean
  dd_complete_seller: boolean
  dd_complete_buyer: boolean
  cc_complete_seller: boolean
  cc_complete_buyer: boolean
  loi_seller_signed: boolean
  loi_buyer_signed: boolean
  loi_seller_signed_at: string | null
  loi_buyer_signed_at: string | null
  book_transfer_completed_at: string | null
  seller: { id: string; full_name: string; avatar_url: string | null }
  buyer:  { id: string; full_name: string; avatar_url: string | null }
}

type DealDocument = {
  id: string
  title: string
  storage_path: string
  uploader_name: string
  created_at: string
  signed_url: string | null
}

type DealClient = {
  id: string
  client_name: string
  client_email: string
  carrier: string | null
  policy_id: string | null
  consent_status: 'pending' | 'consented' | 'refused'
  consent_responded_at: string | null
  email_sent_at: string | null
}

type Note = {
  id: string
  author_id: string
  author_name: string
  author_role: 'seller' | 'buyer' | 'mga'
  body: string
  created_at: string
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function Avatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: BRAND.midnight, color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.34, fontWeight: 700, fontFamily: FONT,
      flexShrink: 0, overflow: 'hidden',
    }}>
      {url
        ? <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initials}
    </div>
  )
}

function StageBar({ status }: { status: string }) {
  const current      = stageIndex(status)
  const total        = DISPLAY_STAGES.length
  const currentLabel = current >= 0 ? DISPLAY_STAGES[current].label : 'Cancelled'
  const fillPct      = current <= 0 ? 0 : Math.round((current / (total - 1)) * 100)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontFamily: FONT, fontSize: 15, fontWeight: 600, color: BRAND.midnight }}>{currentLabel}</span>
        {current >= 0 && (
          <span style={{ fontFamily: FONT, fontSize: 14, color: '#9CA3AF' }}>Step {current + 1} of {total}</span>
        )}
      </div>
      <div style={{ height: 6, background: BRAND.border, borderRadius: 100, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ height: '100%', width: `${fillPct}%`, background: BRAND.electric, borderRadius: 100 }} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', fontFamily: FONT, fontSize: 11, lineHeight: 1.6 }}>
        {DISPLAY_STAGES.map((stage, i) => {
          const done   = i < current
          const active = i === current
          return (
            <span key={stage.label} style={{ display: 'inline-flex', alignItems: 'center' }}>
              {i > 0 && <span style={{ color: '#D4D4CF', margin: '0 5px' }}>·</span>}
              <span style={{ fontWeight: active ? 700 : done ? 500 : 400, color: done ? BRAND.electric : active ? BRAND.midnight : '#B4B2A9' }}>
                {stage.label}
              </span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

function PlaceholderTab({ description }: { description: string }) {
  return (
    <div style={{ padding: '40px 32px', textAlign: 'center', color: '#9CA3AF', fontFamily: FONT }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
      <div style={{ fontSize: 14, color: '#9CA3AF' }}>{description}</div>
    </div>
  )
}

// ── Valuation tab ─────────────────────────────────────────────────────────────

function ValuationTab({ deal }: { deal: Deal }) {
  const [valuation, setValuation] = useState<any>(null)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    fetch(`/api/mga/deals/${deal.id}/valuation`)
      .then(r => r.json())
      .then(d => { if (d && !d.error) setValuation(d) })
      .finally(() => setLoading(false))
  }, [deal.id])

  const reached = ['valuation_pending','valuation_shared','loi','due_diligence','client_communication','book_transfer','closed']
  if (!reached.includes(deal.status)) {
    return <PlaceholderTab description="Valuation becomes available once both parties confirm interest." />
  }
  if (loading) return <div style={{ padding: 24, fontFamily: FONT, color: '#9CA3AF', fontSize: 13 }}>Loading…</div>
  if (!valuation) return (
    <div style={{ padding: '28px 32px', fontFamily: FONT, fontSize: 13, color: '#9CA3AF' }}>No valuation on file yet.</div>
  )

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: BRAND.stepNum, marginBottom: 8 }}>
        Book Value Assessment
      </div>
      {valuation.low_value && valuation.high_value ? (
        <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, color: BRAND.midnight, marginBottom: 8 }}>
          {formatMoney(valuation.low_value)} – {formatMoney(valuation.high_value)}
        </div>
      ) : (
        <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 600, color: BRAND.midnight, marginBottom: 8 }}>See uploaded report</div>
      )}
      {valuation.source === 'uploaded' && valuation.document_url && (
        <a href={valuation.document_url} target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-block', marginTop: 12, padding: '7px 14px', fontSize: 12, fontWeight: 600, fontFamily: FONT, borderRadius: 8, background: BRAND.midnight, color: 'white', textDecoration: 'none' }}>
          View uploaded report →
        </a>
      )}
      <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Source',     value: valuation.source ?? '—' },
          { label: 'Shared with buyer', value: valuation.shared_with_buyer ? 'Yes' : 'No' },
          ...(valuation.calculated_at ? [{ label: 'Date', value: fmtDate(valuation.calculated_at) }] : []),
        ].map(item => (
          <div key={item.label} style={{ background: BRAND.chalk, borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: '#888780', marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: BRAND.midnight, textTransform: 'capitalize' }}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── LOI tab ───────────────────────────────────────────────────────────────────

function LOITab({ deal }: { deal: Deal }) {
  const loiReached = ['loi','due_diligence','client_communication','book_transfer','closed'].includes(deal.status)
  if (!loiReached) return <PlaceholderTab description="The LOI becomes available once valuation is shared and confirmed." />

  const bothSigned = deal.loi_seller_signed && deal.loi_buyer_signed

  async function downloadPDF() {
    const res = await fetch(`/api/deals/${deal.id}/loi/pdf`)
    if (!res.ok) return
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `LOI-${deal.id.slice(0, 8)}.pdf`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: BRAND.stepNum, marginBottom: 16 }}>
        Letter of Intent
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Seller', name: deal.seller.full_name, signed: deal.loi_seller_signed, signedAt: deal.loi_seller_signed_at },
          { label: 'Buyer',  name: deal.buyer.full_name,  signed: deal.loi_buyer_signed,  signedAt: deal.loi_buyer_signed_at  },
        ].map(({ label, name, signed, signedAt }) => (
          <div key={label} style={{ flex: 1, minWidth: 180, border: `1px solid ${signed ? '#86EFAC' : BRAND.border}`, borderRadius: 10, padding: '14px 16px', background: signed ? '#F0FDF4' : 'white' }}>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: BRAND.stepNum, marginBottom: 2 }}>{label}</div>
            <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: BRAND.midnight, marginBottom: 6 }}>{name}</div>
            {signed ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
                <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: '#16A34A' }}>Signed</span>
                {signedAt && <span style={{ fontFamily: FONT, fontSize: 11, color: '#64748B' }}>{fmtDate(signedAt)}</span>}
              </div>
            ) : (
              <div style={{ fontFamily: FONT, fontSize: 13, color: '#94A3B8' }}>Awaiting signature</div>
            )}
          </div>
        ))}
      </div>
      {bothSigned && (
        <button onClick={downloadPDF}
          style={{ padding: '9px 20px', border: `1px solid ${BRAND.border}`, borderRadius: 8, background: 'white', color: BRAND.midnight, fontSize: 13, fontWeight: 600, fontFamily: FONT, cursor: 'pointer' }}>
          ↓ Download PDF
        </button>
      )}
    </div>
  )
}

// ── Due Diligence tab (documents) ─────────────────────────────────────────────

function FileTypeIcon({ storagePath }: { storagePath: string }) {
  const ext = storagePath.split('.').pop()?.toLowerCase()
  let color = '#9CA3AF', label = 'FILE'
  if (ext === 'pdf')                        { color = '#E24B4A'; label = 'PDF' }
  else if (ext === 'docx' || ext === 'doc') { color = '#3B82F6'; label = 'DOC' }
  else if (ext === 'png')                   { color = '#9CA3AF'; label = 'PNG' }
  return (
    <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: color + '1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 9, fontWeight: 700, color, letterSpacing: '.05em' }}>
      {label}
    </div>
  )
}

function DueDiligenceTab({ deal }: { deal: Deal }) {
  const dealId = deal.id
  const [documents,    setDocuments]    = useState<DealDocument[]>([])
  const [loading,      setLoading]      = useState(true)
  const [dragOver,     setDragOver]     = useState(false)
  const [uploading,    setUploading]    = useState(false)
  const [pendingFile,  setPendingFile]  = useState<File | null>(null)
  const [pendingTitle, setPendingTitle] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/mga/deals/${dealId}/documents`)
      .then(r => r.json())
      .then(d => { if (d.documents) setDocuments(d.documents) })
      .finally(() => setLoading(false))
  }, [dealId])

  const ALLOWED = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
  ]

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const file = files[0]
    if (!ALLOWED.includes(file.type)) { alert('Only PDF, DOCX, and PNG files are allowed.'); return }
    setPendingFile(file)
    setPendingTitle(file.name.replace(/\.[^/.]+$/, ''))
  }

  async function uploadFile() {
    if (!pendingFile || !pendingTitle.trim()) return
    setUploading(true)
    const form = new FormData()
    form.append('file', pendingFile)
    form.append('title', pendingTitle.trim())
    const res  = await fetch(`/api/mga/deals/${dealId}/documents`, { method: 'POST', body: form })
    const data = await res.json()
    if (data.document) {
      setDocuments(prev => [data.document, ...prev])
      setPendingFile(null)
      setPendingTitle('')
    } else {
      alert(data.error ?? 'Upload failed.')
    }
    setUploading(false)
  }

  // DD confirmation status (read-only for MGA)
  const ddReached = ['due_diligence','client_communication','book_transfer','closed'].includes(deal.status)

  if (loading) return <div style={{ padding: '28px 32px', fontFamily: FONT, fontSize: 13, color: '#9CA3AF' }}>Loading…</div>

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* DD confirmation status */}
      {ddReached && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
          {[
            { label: 'Seller', name: deal.seller.full_name, confirmed: deal.dd_complete_seller },
            { label: 'Buyer',  name: deal.buyer.full_name,  confirmed: deal.dd_complete_buyer  },
          ].map(({ label, name, confirmed }) => (
            <div key={label} style={{ flex: 1, minWidth: 160, border: `1px solid ${confirmed ? '#86EFAC' : BRAND.border}`, borderRadius: 10, padding: '14px 16px', background: confirmed ? '#F0FDF4' : 'white' }}>
              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: BRAND.stepNum, marginBottom: 2 }}>{label}</div>
              <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: BRAND.midnight, marginBottom: 6 }}>{name}</div>
              {confirmed
                ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} /><span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: '#16A34A' }}>Confirmed</span></div>
                : <div style={{ fontFamily: FONT, fontSize: 13, color: '#94A3B8' }}>Pending</div>
              }
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      <div
        onClick={() => !uploading && !pendingFile && fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); if (!pendingFile) setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); if (!pendingFile) handleFiles(e.dataTransfer.files) }}
        style={{ border: `2px dashed ${dragOver ? BRAND.electric : BRAND.border}`, borderRadius: 10, padding: 24, textAlign: 'center', cursor: uploading || pendingFile ? 'default' : 'pointer', marginBottom: pendingFile ? 12 : 24, background: dragOver ? '#F5F8FF' : 'transparent', transition: 'border-color .15s, background .15s' }}
      >
        <input ref={fileInputRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.png,image/png" style={{ display: 'none' }} disabled={uploading} onChange={e => { handleFiles(e.target.files); e.target.value = '' }} />
        <p style={{ fontFamily: FONT, fontSize: 13, color: '#9CA3AF', margin: '0 0 4px' }}>Drop a file or click to upload</p>
        <p style={{ fontFamily: FONT, fontSize: 11, color: '#B4B2A9', margin: 0 }}>PDF, DOCX, or PNG</p>
      </div>

      {pendingFile && (
        <div style={{ border: `1px solid ${BRAND.border}`, borderRadius: 10, padding: '16px 18px', marginBottom: 24, background: '#FAFAFA' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <FileTypeIcon storagePath={pendingFile.name} />
            <span style={{ fontFamily: FONT, fontSize: 12, color: '#9CA3AF', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pendingFile.name}</span>
            <button onClick={() => { setPendingFile(null); setPendingTitle('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#9CA3AF', lineHeight: 1, padding: '0 2px' }}>×</button>
          </div>
          <input type="text" value={pendingTitle} onChange={e => setPendingTitle(e.target.value)} placeholder="Document title" style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', marginBottom: 10, border: `1px solid ${BRAND.border}`, borderRadius: 8, fontFamily: FONT, fontSize: 13, color: BRAND.midnight, outline: 'none', background: 'white' }} />
          <button onClick={uploadFile} disabled={uploading || !pendingTitle.trim()} style={{ padding: '9px 20px', border: 'none', borderRadius: 8, background: pendingTitle.trim() ? BRAND.midnight : '#E5E7EB', color: pendingTitle.trim() ? 'white' : '#9CA3AF', fontSize: 13, fontWeight: 500, fontFamily: FONT, cursor: uploading || !pendingTitle.trim() ? 'not-allowed' : 'pointer' }}>
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      )}

      {documents.length === 0 ? (
        <p style={{ fontFamily: FONT, fontSize: 13, color: '#9CA3AF', textAlign: 'center', margin: 0 }}>No documents uploaded yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {documents.map(doc => (
            <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: `1px solid ${BRAND.border}`, borderRadius: 10, background: 'white' }}>
              <FileTypeIcon storagePath={doc.storage_path} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: BRAND.midnight, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</div>
                <div style={{ fontFamily: FONT, fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{doc.uploader_name} · {fmtDate(doc.created_at)}</div>
              </div>
              {doc.signed_url && (
                <a href={doc.signed_url} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 14px', border: `1px solid ${BRAND.border}`, borderRadius: 7, fontFamily: FONT, fontSize: 12, fontWeight: 500, color: BRAND.midnight, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0, background: 'white' }}>
                  Open →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Client Communications tab ─────────────────────────────────────────────────

function ClientCommunicationsTab({ deal }: { deal: Deal }) {
  const dealId = deal.id
  const [clients, setClients] = useState<DealClient[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/mga/deals/${dealId}/clients`)
      .then(r => r.json())
      .then(d => { if (d.clients) setClients(d.clients) })
      .finally(() => setLoading(false))
  }, [dealId])

  if (loading) return <div style={{ padding: '28px 32px', fontFamily: FONT, fontSize: 13, color: '#9CA3AF' }}>Loading…</div>

  const ccReached = ['client_communication','book_transfer','closed'].includes(deal.status)
  if (!ccReached) return <PlaceholderTab description="Client Communications becomes available once due diligence is complete." />

  const pendingCount   = clients.filter(c => c.consent_status === 'pending').length
  const consentedCount = clients.filter(c => c.consent_status === 'consented').length
  const refusedCount   = clients.filter(c => c.consent_status === 'refused').length

  function clientEffectiveStatus(c: DealClient): 'pending' | 'sent' | 'consented' | 'refused' {
    if (c.consent_status === 'consented') return 'consented'
    if (c.consent_status === 'refused')   return 'refused'
    return c.email_sent_at ? 'sent' : 'pending'
  }

  type S = { bg: string; color: string; label: string }
  const STATUS_MAP: Record<string, S> = {
    pending:   { bg: '#F3F4F6', color: '#6B7280', label: 'Pending'   },
    sent:      { bg: '#DBEAFE', color: '#1E40AF', label: 'Sent'      },
    consented: { bg: '#D1FAE5', color: '#065F46', label: 'Consented' },
    refused:   { bg: '#FEE2E2', color: '#991B1B', label: 'Refused'   },
  }

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Seller / Buyer confirmation */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        {[
          { label: 'Seller', name: deal.seller.full_name, confirmed: deal.cc_complete_seller },
          { label: 'Buyer',  name: deal.buyer.full_name,  confirmed: deal.cc_complete_buyer  },
        ].map(({ label, name, confirmed }) => (
          <div key={label} style={{ flex: 1, minWidth: 160, border: `1px solid ${confirmed ? '#86EFAC' : BRAND.border}`, borderRadius: 10, padding: '14px 16px', background: confirmed ? '#F0FDF4' : 'white' }}>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: BRAND.stepNum, marginBottom: 2 }}>{label}</div>
            <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: BRAND.midnight, marginBottom: 6 }}>{name}</div>
            {confirmed
              ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} /><span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: '#16A34A' }}>Confirmed</span></div>
              : <div style={{ fontFamily: FONT, fontSize: 13, color: '#94A3B8' }}>Pending</div>
            }
          </div>
        ))}
      </div>

      {/* Consent summary */}
      {clients.length > 0 && (
        <>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 12 }}>
            Consent summary
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            {[
              { label: 'Pending',   value: pendingCount   },
              { label: 'Consented', value: consentedCount },
              { label: 'Refused',   value: refusedCount,  red: refusedCount > 0 },
            ].map(card => (
              <div key={card.label} style={{ flex: 1, background: BRAND.chalk, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: '#888780', marginBottom: 4 }}>{card.label}</div>
                <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 600, color: (card as any).red ? '#E24B4A' : BRAND.midnight, lineHeight: 1 }}>{card.value}</div>
              </div>
            ))}
          </div>

          {/* Client list */}
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 12 }}>
            Clients ({clients.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {clients.map(client => {
              const eff = clientEffectiveStatus(client)
              const s   = STATUS_MAP[eff] ?? STATUS_MAP.pending
              let dateStr = ''
              if (eff === 'sent' && client.email_sent_at) dateStr = fmtDate(client.email_sent_at, { month: 'short', day: 'numeric' })
              else if ((eff === 'consented' || eff === 'refused') && client.consent_responded_at) dateStr = fmtDate(client.consent_responded_at, { month: 'short', day: 'numeric' })
              return (
                <div key={client.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: `1px solid ${BRAND.border}`, borderRadius: 10, background: 'white' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: BRAND.midnight }}>{client.client_name}</div>
                    <div style={{ fontFamily: FONT, fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
                      {client.client_email}
                      {client.carrier   && <> · {client.carrier}</>}
                      {client.policy_id && <> · {client.policy_id}</>}
                    </div>
                  </div>
                  <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: s.bg, color: s.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {s.label}{dateStr ? ` · ${dateStr}` : ''}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}

      {clients.length === 0 && (
        <p style={{ fontFamily: FONT, fontSize: 13, color: '#9CA3AF', margin: 0 }}>No clients loaded yet.</p>
      )}
    </div>
  )
}

// ── Book Transfer tab (read-only for MGA) ────────────────────────────────────

function BookTransferTab({ deal }: { deal: Deal }) {
  const btReached = ['book_transfer', 'closed'].includes(deal.status)
  if (!btReached) return <PlaceholderTab description="Book Transfer becomes available once client communications are complete." />

  const isComplete = deal.status === 'closed'

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: BRAND.stepNum, marginBottom: 16 }}>
        Book Transfer
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Seller', name: deal.seller.full_name, confirmed: deal.cc_complete_seller },
          { label: 'Buyer',  name: deal.buyer.full_name,  confirmed: deal.cc_complete_buyer  },
        ].map(({ label, name, confirmed }) => (
          <div key={label} style={{ flex: 1, minWidth: 160, border: `1px solid ${confirmed ? '#86EFAC' : BRAND.border}`, borderRadius: 10, padding: '14px 16px', background: confirmed ? '#F0FDF4' : 'white' }}>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: BRAND.stepNum, marginBottom: 2 }}>{label}</div>
            <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: BRAND.midnight, marginBottom: 6 }}>{name}</div>
            {confirmed
              ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} /><span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: '#16A34A' }}>CC confirmed</span></div>
              : <div style={{ fontFamily: FONT, fontSize: 13, color: '#94A3B8' }}>Pending</div>
            }
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, padding: '16px 20px', borderRadius: 10, border: `1px solid ${isComplete ? '#86EFAC' : BRAND.border}`, background: isComplete ? '#F0FDF4' : 'white', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: isComplete ? '#22C55E' : '#D1D5DB', flexShrink: 0, display: 'inline-block' }} />
        <div>
          <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: BRAND.midnight }}>
            {isComplete ? 'Book transfer complete' : 'Book transfer in progress'}
          </div>
          {deal.book_transfer_completed_at && (
            <div style={{ fontFamily: FONT, fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
              Completed {fmtDate(deal.book_transfer_completed_at, { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Notes tab ─────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  seller: { bg: '#DBEAFE', color: '#1A3266' },
  buyer:  { bg: '#EDE9FE', color: '#4C1D95' },
  mga:    { bg: '#D1FAE5', color: '#065F46' },
}

function NotesTab({ dealId, currentUserId }: { dealId: string; currentUserId: string | null }) {
  const [notes,      setNotes]      = useState<Note[]>([])
  const [loading,    setLoading]    = useState(true)
  const [body,       setBody]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadNotes = useCallback(async () => {
    const res  = await fetch(`/api/deals/${dealId}/notes`)
    const data = await res.json()
    if (data.notes) setNotes(data.notes)
    setLoading(false)
  }, [dealId])

  useEffect(() => { loadNotes() }, [loadNotes])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [notes])

  async function submit() {
    if (!body.trim()) return
    setSubmitting(true)
    const res  = await fetch(`/api/deals/${dealId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    })
    const data = await res.json()
    if (data.note) { setNotes(prev => [...prev, data.note]); setBody('') }
    setSubmitting(false)
  }

  if (loading) return <div style={{ padding: '28px 32px', fontFamily: FONT, fontSize: 13, color: '#9CA3AF' }}>Loading…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 24px' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 420, overflowY: 'auto', marginBottom: 16 }}>
        {notes.length === 0 ? (
          <p style={{ fontFamily: FONT, fontSize: 13, color: '#9CA3AF', textAlign: 'center', margin: '24px 0' }}>No notes yet. Add the first one below.</p>
        ) : notes.map(note => {
          const isMe      = note.author_id === currentUserId
          const roleColor = ROLE_COLORS[note.author_role] ?? ROLE_COLORS.seller
          return (
            <div key={note.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: BRAND.midnight }}>{note.author_name}</span>
                <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 100, background: roleColor.bg, color: roleColor.color, textTransform: 'capitalize' }}>
                  {note.author_role === 'mga' ? 'MGA' : note.author_role}
                </span>
                <span style={{ fontFamily: FONT, fontSize: 11, color: '#9CA3AF' }}>
                  {fmtDate(note.created_at, { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div style={{ maxWidth: '80%', background: isMe ? BRAND.midnight : 'white', color: isMe ? 'white' : BRAND.midnight, border: `1px solid ${isMe ? BRAND.midnight : BRAND.border}`, borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px', padding: '10px 14px', fontFamily: FONT, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {note.body}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <div style={{ borderTop: `1px solid ${BRAND.border}`, paddingTop: 16, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <textarea value={body} onChange={e => setBody(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit() }} placeholder="Add a note… (⌘↵ to send)" rows={2} style={{ flex: 1, padding: '10px 14px', border: `1px solid ${BRAND.border}`, borderRadius: 10, fontFamily: FONT, fontSize: 13, color: BRAND.midnight, resize: 'none', outline: 'none', lineHeight: 1.5 }} />
        <button onClick={submit} disabled={submitting || !body.trim()} style={{ padding: '10px 18px', border: 'none', borderRadius: 10, background: body.trim() ? BRAND.midnight : '#E5E7EB', color: body.trim() ? 'white' : '#9CA3AF', fontSize: 13, fontWeight: 600, fontFamily: FONT, cursor: body.trim() ? 'pointer' : 'not-allowed', flexShrink: 0 }}>
          {submitting ? '…' : 'Send'}
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MgaDealDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug   = params.slug  as string
  const dealId = params.id    as string

  const [deal,          setDeal]          = useState<Deal | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [activeTab,     setActiveTab]     = useState<Tab>('Valuation')

  useEffect(() => {
    Promise.all([
      fetch(`/api/mga/deals/${dealId}`).then(r => r.json()),
      fetch('/api/me').then(r => r.json()),
    ]).then(([dealData, meData]) => {
      if (dealData && !dealData.error) setDeal(dealData)
      if (meData?.user?.id) setCurrentUserId(meData.user.id)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [dealId])

  if (loading) return (
    <main style={{ background: BRAND.chalk, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, color: BRAND.midnight }}>
      Loading…
    </main>
  )

  if (!deal) return (
    <main style={{ background: BRAND.chalk, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, color: BRAND.midnight }}>
      Deal not found.
    </main>
  )

  const isClosed   = deal.status === 'closed'
  const isCanceled = deal.status === 'canceled'

  let badgeBg = '#E6F1FB', badgeColor = '#0C447C'
  if (isCanceled) { badgeBg = '#F1EFE8'; badgeColor = '#5F5E5A' }
  else if (isClosed) { badgeBg = '#EAF3DE'; badgeColor = '#27500A' }

  return (
    <main style={{ background: BRAND.chalk, minHeight: '100vh', paddingBottom: '4rem' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 28px' }}>

        {/* Back */}
        <button onClick={() => router.push(`/mga/${slug}/deals`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#9CA3AF', fontFamily: FONT, marginBottom: '1.25rem', padding: 0 }}>
          ← All deals
        </button>

        {/* Deal card */}
        <div style={{ background: 'white', borderRadius: 14, border: `0.5px solid ${BRAND.border}`, overflow: 'hidden', marginBottom: 20 }}>

          {/* Header */}
          <div style={{ padding: '28px 32px', borderBottom: `1px solid ${BRAND.border}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, marginBottom: 20 }}>
              {/* Seller */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <Avatar name={deal.seller.full_name} url={deal.seller.avatar_url} size={52} />
                <div>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: '#9CA3AF', marginBottom: 3 }}>Seller</div>
                  <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 22, fontWeight: 600, color: BRAND.midnight, lineHeight: 1.2 }}>
                    {deal.seller.full_name}
                  </div>
                </div>
              </div>

              {/* Buyer — badge floats below name, right-aligned */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, justifyContent: 'flex-end' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: '#9CA3AF', marginBottom: 3 }}>Buyer</div>
                  <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 22, fontWeight: 600, color: BRAND.midnight, lineHeight: 1.2 }}>
                    {deal.buyer.full_name}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '3px 11px', borderRadius: 20, background: badgeBg, color: badgeColor, border: `1px solid ${badgeColor}22` }}>
                      {STAGE_LABEL[deal.status] ?? deal.status}
                    </span>
                  </div>
                </div>
                <Avatar name={deal.buyer.full_name} url={deal.buyer.avatar_url} size={52} />
              </div>
            </div>

            {/* Meta */}
            <div style={{ fontFamily: FONT, fontSize: 13, color: '#9CA3AF' }}>
              Started {fmtDate(deal.created_at, { month: 'long', day: 'numeric', year: 'numeric' })}
              <span style={{ margin: '0 6px' }}>·</span>
              Last activity {fmtDate(deal.updated_at, { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>

          {/* Stage bar */}
          <div style={{ padding: '20px 32px 16px', borderBottom: `1px solid ${BRAND.border}` }}>
            <StageBar status={deal.status} />
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 3, padding: '0 20px 0', background: '#F7F7F6', borderBottom: `1px solid ${BRAND.border}` }}>
            {TABS.map(tab => {
              const isActive = activeTab === tab
              return (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '9px 15px', marginTop: 12, border: `1px solid ${BRAND.border}`, borderBottom: isActive ? '1px solid white' : `1px solid ${BRAND.border}`, borderRadius: '6px 6px 0 0', background: isActive ? 'white' : '#F7F7F6', fontFamily: FONT, fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? BRAND.midnight : '#9CA3AF', cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: -1, position: 'relative', zIndex: isActive ? 2 : 1 }}>
                  {tab}
                </button>
              )
            })}
          </div>

          {/* Tab content */}
          <div style={{ minHeight: 200 }}>
            {activeTab === 'Valuation'             && <ValuationTab             deal={deal} />}
            {activeTab === 'Letter of Intent'      && <LOITab                   deal={deal} />}
            {activeTab === 'Due Diligence'         && <DueDiligenceTab          deal={deal} />}
            {activeTab === 'Client Communications' && <ClientCommunicationsTab  deal={deal} />}
            {activeTab === 'Notes'                 && <NotesTab dealId={dealId} currentUserId={currentUserId} />}
          </div>

        </div>
      </div>
    </main>
  )
}
