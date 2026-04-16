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

function stageIndex(status: string) {
  return DISPLAY_STAGES.findIndex(s => s.keys.includes(status))
}

function fmtDate(iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-CA', opts ?? { month: 'short', day: 'numeric', year: 'numeric' })
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

type Tab = 'Overview' | 'Documents' | 'Notes'

// ── Sub-components ─────────────────────────────────────────────────────────────

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
        : initials
      }
    </div>
  )
}

function StageBar({ status }: { status: string }) {
  const current     = stageIndex(status)
  const total       = DISPLAY_STAGES.length
  const currentLabel = current >= 0 ? DISPLAY_STAGES[current].label : 'Cancelled'
  const fillPct     = current <= 0 ? 0 : Math.round((current / (total - 1)) * 100)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontFamily: FONT, fontSize: 15, fontWeight: 600, color: BRAND.midnight }}>
          {currentLabel}
        </span>
        {current >= 0 && (
          <span style={{ fontFamily: FONT, fontSize: 14, color: '#9CA3AF' }}>
            Step {current + 1} of {total}
          </span>
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
              <span style={{
                fontWeight: active ? 700 : done ? 500 : 400,
                color: done ? BRAND.electric : active ? BRAND.midnight : '#B4B2A9',
              }}>
                {stage.label}
              </span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function ConfirmationRow({ label, confirmed, date }: { label: string; confirmed: boolean; date?: string | null }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${BRAND.border}` }}>
      <div style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
        background: confirmed ? '#D1FAE5' : '#F3F4F6',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {confirmed
          ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#065F46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          : <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#D1D5DB' }} />
        }
      </div>
      <span style={{ fontFamily: FONT, fontSize: 13, color: BRAND.midnight, flex: 1 }}>{label}</span>
      {confirmed && date && (
        <span style={{ fontFamily: FONT, fontSize: 11, color: '#9CA3AF' }}>{fmtDate(date)}</span>
      )}
      {!confirmed && (
        <span style={{ fontFamily: FONT, fontSize: 11, color: '#9CA3AF' }}>Pending</span>
      )}
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', border: `0.5px solid ${BRAND.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BRAND.border}`, fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: '#9CA3AF' }}>
        {title}
      </div>
      <div style={{ padding: '0 20px' }}>
        {children}
      </div>
    </div>
  )
}

function OverviewTab({ deal, dealId }: { deal: Deal; dealId: string }) {
  const [clients, setClients] = useState<DealClient[]>([])

  useEffect(() => {
    fetch(`/api/mga/deals/${dealId}/clients`)
      .then(r => r.json())
      .then(d => { if (d.clients) setClients(d.clients) })
  }, [dealId])

  const pendingCount   = clients.filter(c => c.consent_status === 'pending').length
  const consentedCount = clients.filter(c => c.consent_status === 'consented').length
  const refusedCount   = clients.filter(c => c.consent_status === 'refused').length

  const stageIdx = stageIndex(deal.status)
  const loiReached = stageIdx >= 2
  const ddReached  = stageIdx >= 3
  const ccReached  = stageIdx >= 4

  return (
    <div>
      {/* Interest confirmation */}
      {stageIdx >= 0 && (
        <SectionCard title="Interest">
          <ConfirmationRow label={`${deal.seller.full_name} (Seller)`} confirmed={deal.seller_confirmed_next} />
          <ConfirmationRow label={`${deal.buyer.full_name} (Buyer)`}   confirmed={deal.buyer_confirmed_next} />
        </SectionCard>
      )}

      {/* LOI */}
      <SectionCard title="Letter of Intent">
        {!loiReached ? (
          <div style={{ padding: '14px 0', fontFamily: FONT, fontSize: 13, color: '#9CA3AF' }}>Not yet reached</div>
        ) : (
          <>
            <ConfirmationRow label={`${deal.seller.full_name} (Seller)`} confirmed={deal.loi_seller_signed} date={deal.loi_seller_signed_at} />
            <ConfirmationRow label={`${deal.buyer.full_name} (Buyer)`}   confirmed={deal.loi_buyer_signed}  date={deal.loi_buyer_signed_at}  />
          </>
        )}
      </SectionCard>

      {/* Due Diligence */}
      <SectionCard title="Due Diligence">
        {!ddReached ? (
          <div style={{ padding: '14px 0', fontFamily: FONT, fontSize: 13, color: '#9CA3AF' }}>Not yet reached</div>
        ) : (
          <>
            <ConfirmationRow label={`${deal.seller.full_name} (Seller)`} confirmed={deal.dd_complete_seller} />
            <ConfirmationRow label={`${deal.buyer.full_name} (Buyer)`}   confirmed={deal.dd_complete_buyer}  />
          </>
        )}
      </SectionCard>

      {/* Client Communications */}
      <SectionCard title="Client Communications">
        {!ccReached ? (
          <div style={{ padding: '14px 0', fontFamily: FONT, fontSize: 13, color: '#9CA3AF' }}>Not yet reached</div>
        ) : (
          <>
            <ConfirmationRow label={`${deal.seller.full_name} (Seller)`} confirmed={deal.cc_complete_seller} />
            <ConfirmationRow label={`${deal.buyer.full_name} (Buyer)`}   confirmed={deal.cc_complete_buyer}  />
            {clients.length > 0 && (
              <div style={{ display: 'flex', gap: 10, padding: '16px 0' }}>
                {[
                  { label: 'Pending',   value: pendingCount   },
                  { label: 'Consented', value: consentedCount },
                  { label: 'Refused',   value: refusedCount,  red: refusedCount > 0 },
                ].map(card => (
                  <div key={card.label} style={{ flex: 1, background: BRAND.chalk, borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: '#888780', marginBottom: 4 }}>
                      {card.label}
                    </div>
                    <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, color: (card as any).red ? '#E24B4A' : BRAND.midnight, lineHeight: 1 }}>
                      {card.value}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </SectionCard>
    </div>
  )
}

// ── Documents tab ─────────────────────────────────────────────────────────────

function FileTypeIcon({ storagePath }: { storagePath: string }) {
  const ext = storagePath.split('.').pop()?.toLowerCase()
  let color = '#9CA3AF', label = 'FILE'
  if (ext === 'pdf')                       { color = '#E24B4A'; label = 'PDF' }
  else if (ext === 'docx' || ext === 'doc') { color = '#3B82F6'; label = 'DOC' }
  else if (ext === 'png')                  { color = '#9CA3AF'; label = 'PNG' }
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
      background: color + '1A',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FONT, fontSize: 9, fontWeight: 700, color, letterSpacing: '.05em',
    }}>
      {label}
    </div>
  )
}

function DocumentsTab({ dealId }: { dealId: string }) {
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

  if (loading) return (
    <div style={{ fontFamily: FONT, fontSize: 13, color: '#9CA3AF', padding: '24px 0' }}>Loading…</div>
  )

  return (
    <div>
      {/* Upload zone */}
      <div
        onClick={() => !uploading && !pendingFile && fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); if (!pendingFile) setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); if (!pendingFile) handleFiles(e.dataTransfer.files) }}
        style={{
          border: `2px dashed ${dragOver ? BRAND.electric : BRAND.border}`,
          borderRadius: 10, padding: 24, textAlign: 'center',
          cursor: uploading || pendingFile ? 'default' : 'pointer',
          marginBottom: pendingFile ? 12 : 24,
          background: dragOver ? '#F5F8FF' : 'transparent',
          transition: 'border-color .15s, background .15s',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.png,image/png"
          style={{ display: 'none' }}
          disabled={uploading}
          onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
        />
        <p style={{ fontFamily: FONT, fontSize: 13, color: '#9CA3AF', margin: '0 0 4px' }}>
          Drop a file or click to upload
        </p>
        <p style={{ fontFamily: FONT, fontSize: 11, color: '#B4B2A9', margin: 0 }}>PDF, DOCX, or PNG</p>
      </div>

      {/* Staging area */}
      {pendingFile && (
        <div style={{ border: `1px solid ${BRAND.border}`, borderRadius: 10, padding: '16px 18px', marginBottom: 24, background: '#FAFAFA' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <FileTypeIcon storagePath={pendingFile.name} />
            <span style={{ fontFamily: FONT, fontSize: 12, color: '#9CA3AF', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {pendingFile.name}
            </span>
            <button onClick={() => { setPendingFile(null); setPendingTitle('') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#9CA3AF', lineHeight: 1, padding: '0 2px' }}>
              ×
            </button>
          </div>
          <input
            type="text"
            value={pendingTitle}
            onChange={e => setPendingTitle(e.target.value)}
            placeholder="Document title"
            style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', marginBottom: 10, border: `1px solid ${BRAND.border}`, borderRadius: 8, fontFamily: FONT, fontSize: 13, color: BRAND.midnight, outline: 'none', background: 'white' }}
          />
          <button
            onClick={uploadFile}
            disabled={uploading || !pendingTitle.trim()}
            style={{ padding: '9px 20px', border: 'none', borderRadius: 8, background: pendingTitle.trim() ? BRAND.midnight : '#E5E7EB', color: pendingTitle.trim() ? 'white' : '#9CA3AF', fontSize: 13, fontWeight: 500, fontFamily: FONT, cursor: uploading || !pendingTitle.trim() ? 'not-allowed' : 'pointer' }}
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      )}

      {/* Document list */}
      {documents.length === 0 ? (
        <p style={{ fontFamily: FONT, fontSize: 13, color: '#9CA3AF', textAlign: 'center', margin: 0 }}>
          No documents uploaded yet.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {documents.map(doc => (
            <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: `1px solid ${BRAND.border}`, borderRadius: 10, background: 'white' }}>
              <FileTypeIcon storagePath={doc.storage_path} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: BRAND.midnight, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.title}
                </div>
                <div style={{ fontFamily: FONT, fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                  {doc.uploader_name} · {fmtDate(doc.created_at)}
                </div>
              </div>
              {doc.signed_url && (
                <a href={doc.signed_url} target="_blank" rel="noopener noreferrer"
                  style={{ padding: '6px 14px', border: `1px solid ${BRAND.border}`, borderRadius: 7, fontFamily: FONT, fontSize: 12, fontWeight: 500, color: BRAND.midnight, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0, background: 'white' }}>
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

  if (loading) return (
    <div style={{ fontFamily: FONT, fontSize: 13, color: '#9CA3AF', padding: '24px 0' }}>Loading…</div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 420, overflowY: 'auto', marginBottom: 16 }}>
        {notes.length === 0 ? (
          <p style={{ fontFamily: FONT, fontSize: 13, color: '#9CA3AF', textAlign: 'center', margin: '24px 0' }}>
            No notes yet. Add the first one below.
          </p>
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
              <div style={{
                maxWidth: '80%',
                background: isMe ? BRAND.midnight : 'white',
                color: isMe ? 'white' : BRAND.midnight,
                border: `1px solid ${isMe ? BRAND.midnight : BRAND.border}`,
                borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                padding: '10px 14px', fontFamily: FONT, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap',
              }}>
                {note.body}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ borderTop: `1px solid ${BRAND.border}`, paddingTop: 16, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit() }}
          placeholder="Add a note… (⌘↵ to send)"
          rows={2}
          style={{ flex: 1, padding: '10px 14px', border: `1px solid ${BRAND.border}`, borderRadius: 10, fontFamily: FONT, fontSize: 13, color: BRAND.midnight, resize: 'none', outline: 'none', lineHeight: 1.5 }}
        />
        <button
          onClick={submit}
          disabled={submitting || !body.trim()}
          style={{ padding: '10px 18px', border: 'none', borderRadius: 10, background: body.trim() ? BRAND.midnight : '#E5E7EB', color: body.trim() ? 'white' : '#9CA3AF', fontSize: 13, fontWeight: 600, fontFamily: FONT, cursor: body.trim() ? 'pointer' : 'not-allowed', flexShrink: 0 }}
        >
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
  const slug   = params.slug as string
  const dealId = params.id   as string

  const [deal,          setDeal]          = useState<Deal | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [activeTab,     setActiveTab]     = useState<Tab>('Overview')

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

  const TABS: Tab[] = ['Overview', 'Documents', 'Notes']

  return (
    <main style={{ background: BRAND.chalk, minHeight: '100vh', paddingBottom: '4rem' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 28px' }}>

        {/* Back */}
        <button
          onClick={() => router.push(`/mga/${slug}/deals`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#9CA3AF', fontFamily: FONT, marginBottom: '1.25rem', padding: 0 }}
        >
          ← All deals
        </button>

        {/* Deal card */}
        <div style={{ background: 'white', borderRadius: 14, border: `0.5px solid ${BRAND.border}`, overflow: 'hidden', marginBottom: 20 }}>

          {/* Header */}
          <div style={{ padding: '28px 32px', borderBottom: `1px solid ${BRAND.border}` }}>
            {/* Seller + Buyer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20 }}>
              {/* Seller */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <Avatar name={deal.seller.full_name} url={deal.seller.avatar_url} size={48} />
                <div>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: '#9CA3AF', marginBottom: 2 }}>Seller</div>
                  <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 20, fontWeight: 600, color: BRAND.midnight, lineHeight: 1.2 }}>
                    {deal.seller.full_name}
                  </div>
                </div>
              </div>

              {/* vs divider */}
              <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <div style={{ height: 1, width: 32, background: BRAND.border }} />
                <span style={{ fontFamily: FONT, fontSize: 11, color: '#B4B2A9', fontWeight: 600, letterSpacing: '.05em' }}>VS</span>
                <div style={{ height: 1, width: 32, background: BRAND.border }} />
              </div>

              {/* Buyer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, justifyContent: 'flex-end' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: '#9CA3AF', marginBottom: 2 }}>Buyer</div>
                  <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 20, fontWeight: 600, color: BRAND.midnight, lineHeight: 1.2 }}>
                    {deal.buyer.full_name}
                  </div>
                </div>
                <Avatar name={deal.buyer.full_name} url={deal.buyer.avatar_url} size={48} />
              </div>
            </div>

            {/* Meta row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 20, background: badgeBg, color: badgeColor, border: `1px solid ${badgeColor}22` }}>
                {STAGE_LABEL[deal.status] ?? deal.status}
              </span>
              <span style={{ fontFamily: FONT, fontSize: 13, color: '#9CA3AF' }}>
                Started {fmtDate(deal.created_at, { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              <span style={{ fontFamily: FONT, fontSize: 13, color: '#9CA3AF' }}>
                · Last activity {fmtDate(deal.updated_at, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
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
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '9px 15px', marginTop: 12,
                    border: `1px solid ${BRAND.border}`,
                    borderBottom: isActive ? '1px solid white' : `1px solid ${BRAND.border}`,
                    borderRadius: '6px 6px 0 0',
                    background: isActive ? 'white' : '#F7F7F6',
                    fontFamily: FONT, fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? BRAND.midnight : '#9CA3AF',
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    marginBottom: -1, position: 'relative', zIndex: isActive ? 2 : 1,
                  }}
                >
                  {tab}
                </button>
              )
            })}
          </div>

          {/* Tab content */}
          <div style={{ padding: '28px 32px', minHeight: 200 }}>
            {activeTab === 'Overview'   && <OverviewTab   deal={deal} dealId={dealId} />}
            {activeTab === 'Documents'  && <DocumentsTab  dealId={dealId} />}
            {activeTab === 'Notes'      && <NotesTab      dealId={dealId} currentUserId={currentUserId} />}
          </div>

        </div>
      </div>
    </main>
  )
}
