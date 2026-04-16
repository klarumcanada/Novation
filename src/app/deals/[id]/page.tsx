'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import NovationNav from '@/components/NovationNav'

const BRAND = {
  midnight: '#0D1B3E',
  electric: '#3B82F6',
  chalk:    '#F0EDE7',
  navy:     '#1A3266',
  border:   '#E2E6F0',
  stepNum:  '#C5CDE8',
}

const STAGES = [
  { key: 'interested',           label: 'Interest' },
  { key: 'valuation_pending',    label: 'Valuation' },
  { key: 'valuation_shared',     label: 'Valuation' },
  { key: 'loi',                  label: 'Letter of Intent' },
  { key: 'due_diligence',        label: 'Due Diligence' },
  { key: 'client_communication', label: 'Client Communications' },
  { key: 'book_transfer',        label: 'Book Transfer' },
  { key: 'closed',               label: 'Deal Complete' },
] as const

// Deduplicated for display (valuation_pending + valuation_shared = one step)
const DISPLAY_STAGES = [
  { keys: ['interested'],                           label: 'Interest' },
  { keys: ['valuation_pending','valuation_shared'], label: 'Valuation' },
  { keys: ['loi'],                                  label: 'Letter of Intent' },
  { keys: ['due_diligence'],                        label: 'Due Diligence' },
  { keys: ['client_communication'],                 label: 'Client Communications' },
  { keys: ['book_transfer'],                        label: 'Book Transfer' },
  { keys: ['closed'],                               label: 'Deal Complete' },
]

function stageIndex(status: string) {
  return DISPLAY_STAGES.findIndex(s => s.keys.includes(status))
}

type Note = {
  id: string
  author_id: string
  author_name: string
  author_role: 'seller' | 'buyer' | 'mga'
  body: string
  created_at: string
}

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  seller: { bg: '#DBEAFE', color: '#1A3266' },
  buyer:  { bg: '#EDE9FE', color: '#4C1D95' },
  mga:    { bg: '#D1FAE5', color: '#065F46' },
}

function Avatar({ name, url, size = 44 }: { name: string; url?: string | null; size?: number }) {
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: BRAND.midnight, color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.34, fontWeight: 700,
      fontFamily: 'DM Sans, sans-serif', flexShrink: 0, overflow: 'hidden',
    }}>
      {url
        ? <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initials
      }
    </div>
  )
}

// ─── Stage Progress Tracker ───────────────────────────────────────────────────
function StageBar({ status }: { status: string }) {
  const current = stageIndex(status)
  const total   = DISPLAY_STAGES.length
  const currentLabel = current >= 0 ? DISPLAY_STAGES[current].label : 'Canceled'
  const fillPct = current <= 0 ? 0 : Math.round((current / (total - 1)) * 100)

  return (
    <div>
      {/* Top row: current stage name + step counter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 600, color: BRAND.midnight }}>
          {currentLabel}
        </span>
        {current >= 0 && (
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: '#9CA3AF' }}>
            Step {current + 1} of {total}
          </span>
        )}
      </div>

      {/* Bar */}
      <div style={{ height: 6, background: '#E2E6F0', borderRadius: 100, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ height: '100%', width: `${fillPct}%`, background: BRAND.electric, borderRadius: 100 }} />
      </div>

      {/* Step labels with · separators */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', fontFamily: 'DM Sans, sans-serif', fontSize: 11, lineHeight: 1.6 }}>
        {DISPLAY_STAGES.map((stage, i) => {
          const done   = i < current
          const active = i === current
          return (
            <span key={stage.label} style={{ display: 'inline-flex', alignItems: 'center' }}>
              {i > 0 && (
                <span style={{ color: '#D4D4CF', margin: '0 5px' }}>·</span>
              )}
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

// ─── Tab bar ─────────────────────────────────────────────────────────────────
const TABS = ['Valuation', 'Letter of Intent', 'Due Diligence', 'Client Communications', 'Notes'] as const
type Tab = typeof TABS[number]

// Maps each tab to the DISPLAY_STAGES index whose passage marks it "done"
const TAB_STAGE_IDX: Partial<Record<Tab, number>> = {
  'Valuation':             1,
  'Letter of Intent':      2,
  'Due Diligence':         3,
  'Client Communications': 4,
}

function TabBar({ active, onChange, dealStatus }: { active: Tab; onChange: (t: Tab) => void; dealStatus: string }) {
  const currentIdx = stageIndex(dealStatus)

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-end',
      gap: 3,
      padding: '0 20px 0',
      background: '#F7F7F6',
      borderBottom: `1px solid ${BRAND.border}`,
    }}>
      {TABS.map(tab => {
        const isActive  = active === tab
        const stageIdx  = TAB_STAGE_IDX[tab]
        // Notes is always in "done" style; other tabs done when their stage is passed
        const isDone    = tab === 'Notes' || (stageIdx !== undefined && currentIdx > stageIdx)

        let bg: string, color: string, fontWeight: number

        if (isActive) {
          bg = 'white'; color = BRAND.midnight; fontWeight = 600
        } else if (isDone) {
          bg = '#F5F8FF'; color = BRAND.electric; fontWeight = 400
        } else {
          bg = '#F7F7F6'; color = '#B4B2A9'; fontWeight = 400
        }

        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            style={{
              padding: '9px 15px',
              marginTop: 12,
              border: `1px solid ${BRAND.border}`,
              borderBottom: isActive ? '1px solid white' : `1px solid ${BRAND.border}`,
              borderRadius: '6px 6px 0 0',
              background: bg,
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              fontWeight,
              color,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              marginBottom: -1,
              position: 'relative',
              zIndex: isActive ? 2 : 1,
            }}
          >
            {tab}
          </button>
        )
      })}
    </div>
  )
}

// ─── Placeholder tab ─────────────────────────────────────────────────────────
function PlaceholderTab({ title, description }: { title: string; description: string }) {
  return (
    <div style={{
      padding: '40px 32px', textAlign: 'center',
      color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif',
    }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: BRAND.midnight, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13 }}>{description}</div>
    </div>
  )
}

// ─── Valuation tab ───────────────────────────────────────────────────────────
function ValuationTab({ deal }: { deal: any }) {
  const [valuation, setValuation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/valuations')
      .then(r => r.json())
      .then(d => { if (d && !d.error) setValuation(d) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ padding: 24, fontFamily: 'DM Sans, sans-serif', color: '#9CA3AF', fontSize: 13 }}>Loading…</div>

  const statusesThatHaveValuation = ['valuation_pending','valuation_shared','loi','due_diligence','client_communication','book_transfer','closed']
  if (!statusesThatHaveValuation.includes(deal.status)) {
    return <PlaceholderTab title="Not yet reached" description="Valuation becomes available once both parties confirm interest." />
  }

  if (!valuation) return (
    <div style={{ padding: 24 }}>
      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9CA3AF' }}>No valuation on file yet.</p>
    </div>
  )

  function formatMoney(n: number) {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
    return `$${n.toLocaleString()}`
  }

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: BRAND.stepNum, marginBottom: 8 }}>
        Book Value Assessment
      </div>
      {valuation.low_value && valuation.high_value ? (
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 22, fontWeight: 600, color: BRAND.midnight, marginBottom: 8 }}>
          {formatMoney(valuation.low_value)} – {formatMoney(valuation.high_value)}
        </div>
      ) : (
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 600, color: BRAND.midnight, marginBottom: 8 }}>See uploaded report</div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        {valuation.source === 'novation' && (
          <button onClick={() => router.push('/valuation/report')}
            style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', borderRadius: 8, border: 'none', background: BRAND.midnight, color: 'white', cursor: 'pointer' }}>
            View Full Report →
          </button>
        )}
        {valuation.source === 'uploaded' && valuation.document_url && (
          <a href={valuation.document_url} target="_blank" rel="noopener noreferrer"
            style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', borderRadius: 8, border: 'none', background: BRAND.midnight, color: 'white', cursor: 'pointer', textDecoration: 'none' }}>
            View uploaded report →
          </a>
        )}
      </div>
      {valuation.shared_with_buyer && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#639922', flexShrink: 0, display: 'inline-block' }} />
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#3B6D11' }}>Shared with buyer</span>
        </div>
      )}
    </div>
  )
}

// ─── LOI tab ─────────────────────────────────────────────────────────────────
function LOITab({ deal }: { deal: any }) {
  const router = useRouter()
  const loiStages = ['loi','due_diligence','client_communication','book_transfer','closed']
  if (!loiStages.includes(deal.status)) {
    return <PlaceholderTab title="Not yet reached" description="The LOI becomes available once valuation is shared and confirmed." />
  }

  const bothSigned = deal.loi_seller_signed && deal.loi_buyer_signed

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: BRAND.stepNum, marginBottom: 16 }}>
        Letter of Intent
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Seller', signed: deal.loi_seller_signed, signedAt: deal.loi_seller_signed_at },
          { label: 'Buyer',  signed: deal.loi_buyer_signed,  signedAt: deal.loi_buyer_signed_at  },
        ].map(({ label, signed, signedAt }) => (
          <div key={label} style={{
            flex: 1, minWidth: 180,
            border: `1px solid ${signed ? '#86EFAC' : BRAND.border}`,
            borderRadius: 10, padding: '14px 16px',
            background: signed ? '#F0FDF4' : 'white',
          }}>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: BRAND.stepNum, marginBottom: 4 }}>{label}</div>
            {signed ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, color: '#16A34A' }}>Signed</span>
                </div>
                {signedAt && <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#64748B' }}>{new Date(signedAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}</div>}
              </>
            ) : (
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#94A3B8' }}>Awaiting signature</div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {deal.status === 'loi' && (
          <button
            onClick={() => router.push(`/deals/${deal.id}/loi`)}
            style={{ padding: '9px 20px', border: 'none', borderRadius: 8, background: BRAND.midnight, color: 'white', fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
            📄 Open LOI →
          </button>
        )}
        {bothSigned && (
          <button
            onClick={async () => {
              const res = await fetch(`/api/deals/${deal.id}/loi/pdf`)
              if (!res.ok) return
              const blob = await res.blob()
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url; a.download = `LOI-${deal.id.slice(0,8)}.pdf`; a.click()
              URL.revokeObjectURL(url)
            }}
            style={{ padding: '9px 20px', border: `1px solid ${BRAND.border}`, borderRadius: 8, background: 'white', color: BRAND.midnight, fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
            ↓ Download PDF
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Notes tab ───────────────────────────────────────────────────────────────
function NotesTab({ dealId, currentUserId }: { dealId: string; currentUserId: string | null }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadNotes = useCallback(async () => {
    const res = await fetch(`/api/deals/${dealId}/notes`)
    const data = await res.json()
    if (data.notes) setNotes(data.notes)
    setLoading(false)
  }, [dealId])

  useEffect(() => { loadNotes() }, [loadNotes])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [notes])

  async function submit() {
    if (!body.trim()) return
    setSubmitting(true)
    const res = await fetch(`/api/deals/${dealId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    })
    const data = await res.json()
    if (data.note) {
      setNotes(prev => [...prev, data.note])
      setBody('')
    }
    setSubmitting(false)
  }

  if (loading) return <div style={{ padding: 24, fontFamily: 'DM Sans, sans-serif', color: '#9CA3AF', fontSize: 13 }}>Loading…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Notes list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 400 }}>
        {notes.length === 0 ? (
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9CA3AF', textAlign: 'center', margin: '24px 0' }}>
            No notes yet. Add the first one below.
          </p>
        ) : notes.map(note => {
          const isMe = note.author_id === currentUserId
          const roleColor = ROLE_COLORS[note.author_role] ?? ROLE_COLORS.seller
          return (
            <div key={note.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, color: BRAND.midnight }}>
                  {note.author_name}
                </span>
                <span style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600,
                  padding: '2px 7px', borderRadius: 100,
                  background: roleColor.bg, color: roleColor.color,
                  textTransform: 'capitalize',
                }}>
                  {note.author_role === 'mga' ? 'MGA' : note.author_role}
                </span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#9CA3AF' }}>
                  {new Date(note.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                  {' '}
                  {new Date(note.created_at).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div style={{
                maxWidth: '80%',
                background: isMe ? BRAND.midnight : 'white',
                color: isMe ? 'white' : BRAND.midnight,
                border: `1px solid ${isMe ? BRAND.midnight : BRAND.border}`,
                borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                padding: '10px 14px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 13,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}>
                {note.body}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        borderTop: `1px solid ${BRAND.border}`,
        padding: '16px 24px',
        display: 'flex', gap: 10, alignItems: 'flex-end',
      }}>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit() }}
          placeholder="Add a note… (⌘↵ to send)"
          rows={2}
          style={{
            flex: 1, padding: '10px 14px',
            border: `1px solid ${BRAND.border}`, borderRadius: 10,
            fontFamily: 'DM Sans, sans-serif', fontSize: 13,
            color: BRAND.midnight, resize: 'none', outline: 'none',
            lineHeight: 1.5,
          }}
        />
        <button
          onClick={submit}
          disabled={submitting || !body.trim()}
          style={{
            padding: '10px 18px',
            border: 'none', borderRadius: 10,
            background: body.trim() ? BRAND.midnight : '#E5E7EB',
            color: body.trim() ? 'white' : '#9CA3AF',
            fontSize: 13, fontWeight: 600,
            fontFamily: 'DM Sans, sans-serif',
            cursor: body.trim() ? 'pointer' : 'not-allowed',
            flexShrink: 0,
          }}
        >
          {submitting ? '…' : 'Send'}
        </button>
      </div>
    </div>
  )
}

// ─── Due Diligence tab ───────────────────────────────────────────────────────
type DealDocument = {
  id: string
  title: string
  storage_path: string
  uploader_name: string
  created_at: string
  signed_url: string | null
}

function FileTypeIcon({ storagePath }: { storagePath: string }) {
  const ext = storagePath.split('.').pop()?.toLowerCase()
  let color = '#9CA3AF'
  let label = 'FILE'
  if (ext === 'pdf')                  { color = '#E24B4A'; label = 'PDF' }
  else if (ext === 'docx' || ext === 'doc') { color = '#3B82F6'; label = 'DOC' }
  else if (ext === 'png')             { color = '#9CA3AF'; label = 'PNG' }

  return (
    <div style={{
      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
      background: color + '1A',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'DM Sans, sans-serif', fontSize: 9, fontWeight: 700,
      color, letterSpacing: '0.05em',
    }}>
      {label}
    </div>
  )
}

function DueDiligenceTab({ dealId, deal, onRefresh }: { dealId: string; deal: any; onRefresh: () => void }) {
  const [documents, setDocuments]   = useState<DealDocument[]>([])
  const [loading, setLoading]       = useState(true)
  const [uploading, setUploading]   = useState(false)
  const [dragOver, setDragOver]     = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [pendingFile, setPendingFile]   = useState<File | null>(null)
  const [pendingTitle, setPendingTitle] = useState('')
  const fileInputRef                = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/deals/${dealId}/documents`)
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
    if (!ALLOWED.includes(file.type)) {
      alert('Only PDF, DOCX, and PNG files are allowed.')
      return
    }
    setPendingFile(file)
    setPendingTitle(file.name.replace(/\.[^/.]+$/, ''))
  }

  async function uploadFile() {
    if (!pendingFile || !pendingTitle.trim()) return
    setUploading(true)
    const form = new FormData()
    form.append('file', pendingFile)
    form.append('title', pendingTitle.trim())
    const res  = await fetch(`/api/deals/${dealId}/documents`, { method: 'POST', body: form })
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
    <div style={{ padding: '28px 32px', fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9CA3AF' }}>
      Loading…
    </div>
  )

  return (
    <div style={{ padding: '28px 32px' }}>

      {/* Upload zone */}
      <div
        onClick={() => !uploading && !pendingFile && fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); if (!pendingFile) setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); if (!pendingFile) handleFiles(e.dataTransfer.files) }}
        style={{
          border: `2px dashed ${dragOver ? BRAND.electric : '#E2E6F0'}`,
          borderRadius: 10,
          padding: 24,
          textAlign: 'center',
          cursor: uploading || pendingFile ? 'default' : 'pointer',
          marginBottom: pendingFile ? 12 : 24,
          background: dragOver ? '#F5F8FF' : 'transparent',
          transition: 'border-color 0.15s, background 0.15s',
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
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9CA3AF', margin: '0 0 4px' }}>
          Drop a file or click to upload
        </p>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#B4B2A9', margin: 0 }}>
          PDF, DOCX, or PNG
        </p>
      </div>

      {/* Staging area — shown when a file is selected but not yet uploaded */}
      {pendingFile && (
        <div style={{
          border: `1px solid ${BRAND.border}`, borderRadius: 10,
          padding: '16px 18px', marginBottom: 24,
          background: '#FAFAFA',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <FileTypeIcon storagePath={pendingFile.name} />
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#9CA3AF', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {pendingFile.name}
            </span>
            <button
              onClick={() => { setPendingFile(null); setPendingTitle('') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#9CA3AF', lineHeight: 1, padding: '0 2px' }}
            >
              ×
            </button>
          </div>
          <input
            type="text"
            value={pendingTitle}
            onChange={e => setPendingTitle(e.target.value)}
            placeholder="Document title"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '9px 12px', marginBottom: 10,
              border: `1px solid ${BRAND.border}`, borderRadius: 8,
              fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: BRAND.midnight,
              outline: 'none', background: 'white',
            }}
          />
          <button
            onClick={uploadFile}
            disabled={uploading || !pendingTitle.trim()}
            style={{
              padding: '9px 20px',
              border: 'none', borderRadius: 8,
              background: pendingTitle.trim() ? BRAND.midnight : '#E5E7EB',
              color: pendingTitle.trim() ? 'white' : '#9CA3AF',
              fontSize: 13, fontWeight: 500,
              fontFamily: 'DM Sans, sans-serif',
              cursor: uploading || !pendingTitle.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      )}

      {/* Document list */}
      {documents.length === 0 ? (
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9CA3AF', textAlign: 'center', margin: 0 }}>
          No documents uploaded yet.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {documents.map(doc => (
            <div key={doc.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px',
              border: `1px solid ${BRAND.border}`,
              borderRadius: 10,
              background: 'white',
            }}>
              <FileTypeIcon storagePath={doc.storage_path} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 500,
                  color: BRAND.midnight, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {doc.title}
                </div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                  {doc.uploader_name} · {new Date(doc.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
              {doc.signed_url && (
                <a
                  href={doc.signed_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '6px 14px',
                    border: `1px solid ${BRAND.border}`,
                    borderRadius: 7,
                    fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 500,
                    color: BRAND.midnight, textDecoration: 'none',
                    whiteSpace: 'nowrap', flexShrink: 0, background: 'white',
                  }}
                >
                  Open →
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* DD complete confirmation — only when deal is in due_diligence */}
      {deal.status === 'due_diligence' && (() => {
        const myConfirmed    = deal.is_seller ? deal.dd_complete_seller : deal.dd_complete_buyer
        const otherConfirmed = deal.is_seller ? deal.dd_complete_buyer  : deal.dd_complete_seller
        const otherParty     = deal.is_seller ? deal.buyer : deal.seller
        const otherFirst     = otherParty?.full_name?.split(' ')[0] ?? 'the other party'

        async function markComplete() {
          setSubmitting(true)
          const res = await fetch(`/api/deals/${dealId}/due-diligence-complete`, { method: 'POST' })
          const data = await res.json()
          if (res.ok) {
            onRefresh()
          } else {
            alert(data.error ?? 'Something went wrong.')
          }
          setSubmitting(false)
        }

        return (
          <div style={{
            borderTop: `1px solid ${BRAND.border}`,
            padding: '20px 32px',
            marginTop: 8,
          }}>
            {myConfirmed ? (
              // State 2 — I've confirmed, waiting on the other party
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#639922', flexShrink: 0, display: 'inline-block' }} />
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#3B6D11' }}>
                  You've marked due diligence complete. Waiting for {otherFirst} to confirm.
                </span>
              </div>
            ) : (
              // State 1 or 3
              <>
                <button
                  onClick={markComplete}
                  disabled={submitting}
                  style={{
                    padding: '9px 20px',
                    border: 'none',
                    borderRadius: 8,
                    background: BRAND.midnight,
                    color: 'white',
                    fontSize: 13,
                    fontWeight: 400,
                    fontFamily: 'DM Sans, sans-serif',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.6 : 1,
                    marginBottom: 8,
                  }}
                >
                  {submitting ? 'Saving…' : 'Mark due diligence complete'}
                </button>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#9CA3AF' }}>
                  {otherConfirmed
                    ? `${otherFirst} has marked due diligence complete. Confirm to advance.`
                    : 'Both parties must confirm to advance to Client Communications.'
                  }
                </div>
              </>
            )}
          </div>
        )
      })()}
    </div>
  )
}

// ─── Client Communications tab ───────────────────────────────────────────────
type DealClient = {
  id: string
  client_name: string
  client_email: string
  carrier?: string | null
  policy_id?: string | null
  consent_status: 'pending' | 'consented' | 'refused'
  consent_responded_at: string | null
  email_sent_at: string | null
}

const DEFAULT_SUBJECT = 'Important update regarding your insurance policy'
const DEFAULT_BODY = `Dear [Client Name],

I am writing to let you know that I am in the process of transferring my book of business to [Buyer Name], an experienced advisor who will be taking over the management of your policy.

[Buyer Name] shares my commitment to providing excellent service and will be reaching out to introduce themselves shortly.

Please click the link below to indicate your consent to this transfer.

[Your Name]`

function parseCSV(text: string): Array<{ client_name: string; client_email: string }> {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))
  const nameIdx  = header.findIndex(h => h.includes('name'))
  const emailIdx = header.findIndex(h => h.includes('email'))
  if (nameIdx === -1 || emailIdx === -1) return []
  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    return { client_name: cols[nameIdx] ?? '', client_email: cols[emailIdx] ?? '' }
  }).filter(c => c.client_name && c.client_email)
}

const CC_TEMPLATES = {
  standard: {
    key: 'standard' as const,
    label: 'Standard consent request',
    description: 'A formal letter explaining the transfer and requesting client consent.',
    subject: DEFAULT_SUBJECT,
    body: DEFAULT_BODY,
  },
  personal: {
    key: 'personal' as const,
    label: 'Personal note from advisor',
    description: 'A warmer, personal message that introduces the new advisor directly.',
    subject: 'A personal note about your insurance coverage',
    body: `Dear [Client Name],

I wanted to reach out personally to share some important news. After many years, I am transitioning my practice to [Buyer Name], a trusted colleague who I know will serve you with the same care and dedication.

[Buyer Name] will be in touch shortly to introduce themselves. In the meantime, please use the link below to provide your consent for this transfer.

Warmly,
[Your Name]`,
  },
  followup: {
    key: 'followup' as const,
    label: 'Follow-up reminder',
    description: 'A brief reminder for clients who have not yet responded.',
    subject: 'Reminder: Your consent is needed for your policy transfer',
    body: `Dear [Client Name],

I wanted to follow up on my earlier message regarding the transfer of your insurance policy to [Buyer Name].

Your consent is still needed to complete this process. Please click the link below at your earliest convenience.

[Your Name]`,
  },
} as const

type CCTemplateKey = keyof typeof CC_TEMPLATES

function clientEffectiveStatus(c: DealClient): 'pending' | 'sent' | 'consented' | 'refused' {
  if (c.consent_status === 'consented') return 'consented'
  if (c.consent_status === 'refused')   return 'refused'
  return c.email_sent_at ? 'sent' : 'pending'
}

function ClientStatusPill({ client }: { client: DealClient }) {
  const eff = clientEffectiveStatus(client)
  type S = { bg: string; color: string; label: string }
  const map: Record<string, S> = {
    pending:   { bg: '#F3F4F6', color: '#6B7280', label: 'Pending'   },
    sent:      { bg: '#DBEAFE', color: '#1E40AF', label: 'Sent'      },
    consented: { bg: '#D1FAE5', color: '#065F46', label: 'Consented' },
    refused:   { bg: '#FEE2E2', color: '#991B1B', label: 'Refused'   },
  }
  const s = map[eff] ?? map.pending

  let dateStr = ''
  if (eff === 'sent' && client.email_sent_at) {
    dateStr = new Date(client.email_sent_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
  } else if ((eff === 'consented' || eff === 'refused') && client.consent_responded_at) {
    dateStr = new Date(client.consent_responded_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
  }

  return (
    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: s.bg, color: s.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
      {s.label}{dateStr ? ` · ${dateStr}` : ''}
    </span>
  )
}

function CCModalOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(13,27,62,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'white', borderRadius: 14, padding: '32px', maxWidth: 480, width: '100%', boxShadow: '0 8px 40px rgba(13,27,62,0.15)' }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

function ImportModal({ onClose, onConfirm, importing }: { onClose: () => void; onConfirm: () => void; importing: boolean }) {
  return (
    <CCModalOverlay onClose={onClose}>
      <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: BRAND.midnight, marginBottom: 10 }}>Import client list from MGA</div>
        <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 14, lineHeight: 1.6 }}>The following fields will be imported from your MGA:</div>
        <ul style={{ margin: '0 0 20px 0', paddingLeft: 18, fontSize: 13, color: BRAND.midnight, lineHeight: 2 }}>
          <li>Client name(s)</li>
          <li>Email address</li>
          <li>Carrier</li>
          <li>Policy ID</li>
        </ul>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: `1px solid ${BRAND.border}`, background: 'white', color: BRAND.midnight, fontSize: 13, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={importing} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: BRAND.midnight, color: 'white', fontSize: 13, fontFamily: 'DM Sans, sans-serif', cursor: importing ? 'not-allowed' : 'pointer', opacity: importing ? 0.6 : 1 }}>
            {importing ? 'Importing…' : 'Confirm & import'}
          </button>
        </div>
      </div>
    </CCModalOverlay>
  )
}

function AddClientModal({ onClose, onSubmit, submitting }: {
  onClose: () => void
  onSubmit: (d: { client_name: string; client_email: string; carrier: string; policy_id: string }) => void
  submitting: boolean
}) {
  const [clientName, setClientName]   = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [carrier, setCarrier]         = useState('')
  const [policyId, setPolicyId]       = useState('')

  const iStyle = {
    width: '100%', boxSizing: 'border-box' as const, padding: '9px 12px', borderRadius: 8,
    border: `1px solid ${BRAND.border}`, fontFamily: 'DM Sans, sans-serif',
    fontSize: 13, color: BRAND.midnight, outline: 'none', background: 'white',
  }
  const canSubmit = clientName.trim() && clientEmail.trim() && !submitting

  return (
    <CCModalOverlay onClose={onClose}>
      <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: BRAND.midnight, marginBottom: 20 }}>Add a client</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          <input type="text"  value={clientName}  onChange={e => setClientName(e.target.value)}  placeholder="Client name(s)" style={iStyle} />
          <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="Email address"  style={iStyle} />
          <input type="text"  value={carrier}     onChange={e => setCarrier(e.target.value)}     placeholder="Carrier"        style={iStyle} />
          <input type="text"  value={policyId}    onChange={e => setPolicyId(e.target.value)}    placeholder="Policy ID"      style={iStyle} />
        </div>
        <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 20, lineHeight: 1.6 }}>
          This client will be visible to the MGA but will not be automatically synced back to their system.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: `1px solid ${BRAND.border}`, background: 'white', color: BRAND.midnight, fontSize: 13, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={() => onSubmit({ client_name: clientName.trim(), client_email: clientEmail.trim(), carrier: carrier.trim(), policy_id: policyId.trim() })}
            disabled={!canSubmit}
            style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: canSubmit ? BRAND.midnight : '#E5E7EB', color: canSubmit ? 'white' : '#9CA3AF', fontSize: 13, fontFamily: 'DM Sans, sans-serif', cursor: canSubmit ? 'pointer' : 'not-allowed' }}
          >
            {submitting ? 'Adding…' : 'Add client'}
          </button>
        </div>
      </div>
    </CCModalOverlay>
  )
}

function SendEmailModal({ clients, defaultTemplate, onClose, onConfirm, sending }: {
  clients: DealClient[]
  defaultTemplate: CCTemplateKey
  onClose: () => void
  onConfirm: (template: CCTemplateKey) => void
  sending: boolean
}) {
  const [template, setTemplate] = useState<CCTemplateKey>(defaultTemplate)

  return (
    <CCModalOverlay onClose={onClose}>
      <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: BRAND.midnight, marginBottom: 16 }}>Send consent email</div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 8 }}>
            Recipients ({clients.length})
          </div>
          <div style={{ maxHeight: 130, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {clients.map(c => (
              <div key={c.id} style={{ fontSize: 13, color: BRAND.midnight }}>
                {c.client_name}<span style={{ color: '#9CA3AF' }}> · {c.client_email}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 8 }}>
            Template
          </div>
          <select
            value={template}
            onChange={e => setTemplate(e.target.value as CCTemplateKey)}
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${BRAND.border}`, fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: BRAND.midnight, outline: 'none', background: 'white' }}
          >
            {Object.values(CC_TEMPLATES).map(t => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: `1px solid ${BRAND.border}`, background: 'white', color: BRAND.midnight, fontSize: 13, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={() => onConfirm(template)}
            disabled={sending}
            style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: BRAND.midnight, color: 'white', fontSize: 13, fontFamily: 'DM Sans, sans-serif', cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.6 : 1 }}
          >
            {sending ? 'Sending…' : `Send to ${clients.length} ${clients.length === 1 ? 'client' : 'clients'}`}
          </button>
        </div>
      </div>
    </CCModalOverlay>
  )
}

function ClientCommunicationsTab({ dealId, deal, onRefresh }: { dealId: string; deal: any; onRefresh: () => void }) {
  const [clients, setClients]   = useState<DealClient[]>([])
  const [loading, setLoading]   = useState(true)
  const [subTab, setSubTab]     = useState<'clients' | 'email'>('clients')
  const [selectedTemplate, setSelectedTemplate] = useState<CCTemplateKey>('standard')

  // Modals
  const [showImport, setShowImport]   = useState(false)
  const [showAdd, setShowAdd]         = useState(false)
  const [sendTargets, setSendTargets] = useState<DealClient[] | null>(null)

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [hoveredId, setHoveredId]     = useState<string | null>(null)

  // Loading states
  const [importing, setImporting]       = useState(false)
  const [addingClient, setAddingClient] = useState(false)
  const [sending, setSending]           = useState(false)
  const [submitting, setSubmitting]     = useState(false)
  const [ccError, setCcError]           = useState('')

  useEffect(() => {
    fetch(`/api/deals/${dealId}/clients`)
      .then(r => r.json())
      .then(d => { if (d.clients) setClients(d.clients) })
      .finally(() => setLoading(false))
  }, [dealId])

  const eligibleClients = clients.filter(c => c.consent_status === 'pending')

  function toggleSelectAll() {
    if (selectedIds.size === eligibleClients.length && eligibleClients.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(eligibleClients.map(c => c.id)))
    }
  }

  function toggleClient(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function runImport() {
    setImporting(true)
    try {
      const res  = await fetch(`/api/deals/${dealId}/clients/mga-import`, { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.clients) {
        setClients(data.clients)
        setShowImport(false)
      } else {
        alert(data.error ?? 'Import failed. Please try again.')
      }
    } catch {
      alert('Import failed. Please try again.')
    }
    setImporting(false)
  }

  async function addClient(d: { client_name: string; client_email: string; carrier: string; policy_id: string }) {
    setAddingClient(true)
    const res  = await fetch(`/api/deals/${dealId}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_name: d.client_name, client_email: d.client_email }),
    })
    const data = await res.json()
    if (data.clients) {
      setClients(prev => [...prev, ...data.clients])
      setShowAdd(false)
    } else {
      alert(data.error ?? 'Failed to add client.')
    }
    setAddingClient(false)
  }

  async function sendEmails(templateKey: CCTemplateKey) {
    if (!sendTargets || sendTargets.length === 0) return
    setSending(true)
    const tmpl = CC_TEMPLATES[templateKey]
    const res  = await fetch(`/api/deals/${dealId}/clients/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: tmpl.subject, body: tmpl.body, client_ids: sendTargets.map(c => c.id) }),
    })
    const data = await res.json()
    if (res.ok) {
      const fresh = await fetch(`/api/deals/${dealId}/clients`).then(r => r.json())
      if (fresh.clients) setClients(fresh.clients)
      setSelectedIds(new Set())
      setSendTargets(null)
    } else {
      alert(data.error ?? 'Failed to send emails.')
    }
    setSending(false)
  }

  async function markCCComplete() {
    setCcError('')
    if (!allConsented) {
      setCcError('All clients must consent before advancing to Book Transfer.')
      return
    }
    setSubmitting(true)
    const res  = await fetch(`/api/deals/${dealId}/cc-complete`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      onRefresh()
    } else {
      alert(data.error ?? 'Something went wrong.')
    }
    setSubmitting(false)
  }

  if (loading) return (
    <div style={{ padding: '28px 32px', fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9CA3AF' }}>Loading…</div>
  )

  const allConsented   = clients.length > 0 && clients.every(c => c.consent_status === 'consented')
  const pendingCount   = clients.filter(c => c.consent_status === 'pending').length
  const consentedCount = clients.filter(c => c.consent_status === 'consented').length
  const refusedCount   = clients.filter(c => c.consent_status === 'refused').length

  const myConfirmed    = deal.is_seller ? deal.cc_complete_seller : deal.cc_complete_buyer
  const otherConfirmed = deal.is_seller ? deal.cc_complete_buyer  : deal.cc_complete_seller
  const otherParty     = deal.is_seller ? deal.buyer : deal.seller
  const otherFirst     = otherParty?.full_name?.split(' ')[0] ?? 'the other party'

  const selectedList          = clients.filter(c => selectedIds.has(c.id))
  const selectAllChecked      = eligibleClients.length > 0 && selectedIds.size === eligibleClients.length
  const selectAllIndeterminate = selectedIds.size > 0 && selectedIds.size < eligibleClients.length

  const pillActive:   React.CSSProperties = { background: BRAND.midnight, color: 'white',   borderRadius: 20, padding: '6px 16px', fontSize: 13, border: 'none',                       fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer' }
  const pillInactive: React.CSSProperties = { background: 'transparent',  color: '#888780', borderRadius: 20, padding: '6px 16px', fontSize: 13, border: `1px solid ${BRAND.border}`, fontFamily: 'DM Sans, sans-serif', fontWeight: 400, cursor: 'pointer' }

  return (
    <div style={{ padding: '28px 32px' }}>

      {/* Modals */}
      {showImport && <ImportModal onClose={() => setShowImport(false)} onConfirm={runImport} importing={importing} />}
      {showAdd    && <AddClientModal onClose={() => setShowAdd(false)} onSubmit={addClient} submitting={addingClient} />}
      {sendTargets && (
        <SendEmailModal
          clients={sendTargets}
          defaultTemplate={selectedTemplate}
          onClose={() => setSendTargets(null)}
          onConfirm={sendEmails}
          sending={sending}
        />
      )}

      {/* Sub-tab pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        <button onClick={() => setSubTab('clients')} style={subTab === 'clients' ? pillActive : pillInactive}>Clients</button>
        <button onClick={() => setSubTab('email')}   style={subTab === 'email'   ? pillActive : pillInactive}>Email template</button>
      </div>

      {/* ── Clients sub-tab ── */}
      {subTab === 'clients' && (
        <div>
          {clients.length === 0 ? (
            /* Empty state */
            <div style={{ border: `2px dashed ${BRAND.border}`, borderRadius: 12, padding: '40px 32px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 600, color: BRAND.midnight, marginBottom: 8 }}>
                No clients loaded yet
              </div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9CA3AF', maxWidth: 340, margin: '0 auto 24px' }}>
                Pull your client list directly from the MGA, or add clients individually.
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setShowImport(true)}
                  style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: BRAND.midnight, color: 'white', fontSize: 13, fontWeight: 500, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}
                >
                  Pull my client list
                </button>
                <button
                  onClick={() => setShowAdd(true)}
                  style={{ padding: '9px 20px', borderRadius: 8, border: `1px solid ${BRAND.border}`, background: 'white', color: BRAND.midnight, fontSize: 13, fontWeight: 400, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}
                >
                  Add a client
                </button>
              </div>
            </div>
          ) : (
            /* Loaded state */
            <>
              {/* Toolbar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' as const }}>
                  <input
                    type="checkbox"
                    checked={selectAllChecked}
                    ref={el => { if (el) el.indeterminate = selectAllIndeterminate }}
                    onChange={toggleSelectAll}
                    style={{ width: 15, height: 15, cursor: 'pointer', accentColor: BRAND.midnight }}
                  />
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#6B7280' }}>
                    {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
                  </span>
                </label>
                <div style={{ flex: 1 }} />
                <button
                  onClick={() => setShowAdd(true)}
                  style={{ padding: '6px 13px', borderRadius: 7, border: `1px solid ${BRAND.border}`, background: 'white', color: BRAND.midnight, fontSize: 12, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  + Add a client
                </button>
                <button
                  onClick={() => setSendTargets(selectedList)}
                  disabled={selectedIds.size === 0}
                  style={{ padding: '6px 13px', borderRadius: 7, border: 'none', background: selectedIds.size > 0 ? BRAND.midnight : '#E5E7EB', color: selectedIds.size > 0 ? 'white' : '#9CA3AF', fontSize: 12, fontWeight: 500, fontFamily: 'DM Sans, sans-serif', cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}
                >
                  Send email
                </button>
              </div>

              {/* Client rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 28 }}>
                {clients.map(client => {
                  const eff      = clientEffectiveStatus(client)
                  const eligible = eff === 'pending' || eff === 'sent'
                  const locked   = !eligible
                  const isHovered = hoveredId === client.id

                  return (
                    <div
                      key={client.id}
                      onMouseEnter={() => setHoveredId(client.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 14px', border: `1px solid ${BRAND.border}`,
                        borderRadius: 10, background: 'white',
                        opacity: locked ? 0.5 : 1, transition: 'opacity 0.1s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(client.id)}
                        disabled={locked}
                        onChange={() => !locked && toggleClient(client.id)}
                        style={{ width: 15, height: 15, cursor: locked ? 'not-allowed' : 'pointer', accentColor: BRAND.midnight, flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 500, color: BRAND.midnight }}>{client.client_name}</div>
                        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
                          {client.client_email}
                          {client.carrier   && <> · {client.carrier}</>}
                          {client.policy_id && <> · {client.policy_id}</>}
                        </div>
                      </div>
                      {eff === 'sent' && isHovered && (
                        <button
                          onClick={() => setSendTargets([client])}
                          style={{ background: 'none', border: 'none', padding: '2px 6px', fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: BRAND.electric, cursor: 'pointer', textDecoration: 'underline', flexShrink: 0 }}
                        >
                          Resend
                        </button>
                      )}
                      <ClientStatusPill client={client} />
                    </div>
                  )
                })}
              </div>

              {/* Consent summary + CC complete */}
              <div style={{ borderTop: `1px solid ${BRAND.border}`, paddingTop: 24 }}>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 14 }}>
                  Consent summary
                </div>

                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  {[
                    { label: 'Pending',   value: pendingCount,   red: false },
                    { label: 'Consented', value: consentedCount, red: false },
                    { label: 'Refused',   value: refusedCount,   red: refusedCount > 0 },
                  ].map(card => (
                    <div key={card.label} style={{ flex: 1, background: 'white', border: `1px solid ${BRAND.border}`, borderRadius: 10, padding: '14px 16px' }}>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#888780', marginBottom: 4 }}>
                        {card.label}
                      </div>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 24, fontWeight: 600, lineHeight: 1, color: card.red ? '#E24B4A' : BRAND.midnight }}>
                        {card.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#9CA3AF', marginBottom: 20 }}>
                  All parties must consent before advancing to Book Transfer.
                </div>

                {deal.status === 'client_communication' && (
                  myConfirmed ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#639922', flexShrink: 0, display: 'inline-block' }} />
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#3B6D11' }}>
                        You've marked client communications complete. Waiting for {otherFirst} to confirm.
                      </span>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={markCCComplete}
                        disabled={submitting}
                        style={{
                          width: '100%', padding: '13px 20px', borderRadius: 8, border: 'none',
                          background: BRAND.midnight, color: 'white',
                          fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                          fontFamily: 'DM Sans, sans-serif', cursor: submitting ? 'not-allowed' : 'pointer',
                          opacity: submitting ? 0.7 : 1, marginBottom: 8,
                        }}
                      >
                        {submitting ? 'Saving…' : 'Mark client communications complete'}
                      </button>
                      {ccError ? (
                        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#E24B4A' }}>
                          {ccError}
                        </div>
                      ) : (
                        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#9CA3AF' }}>
                          {otherConfirmed
                            ? `${otherFirst} has already confirmed. Click to advance to Book Transfer.`
                            : 'Both parties must confirm to advance to Book Transfer.'
                          }
                        </div>
                      )}
                    </>
                  )
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Email template sub-tab ── */}
      {subTab === 'email' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Object.values(CC_TEMPLATES).map(tmpl => {
            const isSelected = selectedTemplate === tmpl.key
            return (
              <button
                key={tmpl.key}
                onClick={() => setSelectedTemplate(tmpl.key)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14, padding: '18px 20px',
                  borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                  border: isSelected ? `2px solid ${BRAND.midnight}` : `1px solid ${BRAND.border}`,
                  background: isSelected ? '#F5F7FF' : 'white',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                  border: isSelected ? `5px solid ${BRAND.midnight}` : `2px solid #D1D5DB`,
                  background: 'white', boxSizing: 'border-box',
                }} />
                <div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, color: BRAND.midnight, marginBottom: 4 }}>
                    {tmpl.label}
                  </div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>
                    {tmpl.description}
                  </div>
                </div>
              </button>
            )
          })}
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
            The selected template pre-populates the send modal and can still be changed before sending.
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [deal, setDeal] = useState<any>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('Valuation')
  const [canceling, setCanceling] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/deals/${id}`).then(r => r.json()),
      fetch('/api/me').then(r => r.json()),
    ]).then(([dealData, meData]) => {
      if (dealData && !dealData.error) setDeal(dealData)
      if (meData?.user?.id) setCurrentUserId(meData.user.id)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: BRAND.chalk, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif', color: BRAND.midnight }}>
      Loading…
    </div>
  )

  if (!deal) return (
    <div style={{ minHeight: '100vh', background: BRAND.chalk, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif', color: BRAND.midnight }}>
      Deal not found.
    </div>
  )

  const other    = deal.is_seller ? deal.buyer : deal.seller
  const isClosed = deal.status === 'closed'

  const STAGE_LABEL_MAP: Record<string, string> = {
    interested:           'Interested',
    valuation_pending:    'Valuation Pending',
    valuation_shared:     'Valuation Shared',
    loi:                  'Letter of Intent',
    due_diligence:        'Due Diligence',
    client_communication: 'Client Communication',
    book_transfer:        'Book Transfer',
    closed:               'Closed',
    canceled:             'Canceled',
  }

  // Badge colours
  let badgeBg     = '#E6F1FB'
  let badgeColor  = '#185FA5'
  let badgeBorder = '#B5D4F4'
  if (deal.status === 'canceled') {
    badgeBg = '#F3F4F6'; badgeColor = '#9CA3AF'; badgeBorder = '#E5E7EB'
  } else if (isClosed) {
    badgeBg = '#D1FAE5'; badgeColor = '#065F46'; badgeBorder = '#6EE7B7'
  }

  async function refreshDeal() {
    const data = await fetch(`/api/deals/${id}`).then(r => r.json())
    if (data && !data.error) setDeal(data)
  }

  async function cancelDeal() {
    if (!window.confirm('Cancel this deal? This cannot be undone.')) return
    setCanceling(true)
    const res = await fetch(`/api/deals/${id}/cancel`, { method: 'POST' })
    const json = await res.json()
    if (res.ok) {
      setDeal((prev: any) => ({ ...prev, status: 'canceled' }))
    } else {
      console.error('Cancel failed:', json)
      alert(`Could not cancel deal: ${json.error ?? 'Unknown error'}`)
    }
    setCanceling(false)
  }

  return (
    <div style={{ background: BRAND.chalk, minHeight: '100vh', paddingBottom: '4rem' }}>
      <NovationNav />
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Back */}
        <button
          onClick={() => router.push('/deals')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif', marginBottom: '1.25rem', padding: 0 }}
        >
          ← My Deals
        </button>

        {/* Deal card */}
        <div style={{ background: 'white', borderRadius: 14, border: `1px solid ${BRAND.border}`, overflow: 'hidden', marginBottom: '1.5rem' }}>

          {/* Header */}
          <div style={{ padding: '28px 32px', borderBottom: `1px solid ${BRAND.border}`, display: 'flex', alignItems: 'center', gap: 18 }}>
            <Avatar name={other.full_name} url={other.avatar_url} size={80} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 28, fontWeight: 600, color: BRAND.midnight, marginBottom: 4, lineHeight: 1.2 }}>
                {other.full_name}
              </div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#9CA3AF' }}>
                {deal.is_seller ? 'Buyer' : 'Seller'} · Started {new Date(deal.created_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
            <span style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 500,
              padding: '5px 16px', borderRadius: 20,
              background: badgeBg, color: badgeColor,
              border: `1px solid ${badgeBorder}`,
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {STAGE_LABEL_MAP[deal.status] ?? deal.status}
            </span>
          </div>

          {/* Stage tracker */}
          <div style={{ padding: '24px 32px 16px' }}>
            <StageBar status={deal.status} />
          </div>

          {/* Tab bar — 16px gap achieved via marginTop on tabs */}
          <TabBar active={activeTab} onChange={setActiveTab} dealStatus={deal.status} />

          {/* Tab content */}
          <div style={{ minHeight: 200 }}>
            {activeTab === 'Valuation'             && <ValuationTab deal={deal} />}
            {activeTab === 'Letter of Intent'      && <LOITab deal={deal} />}
            {activeTab === 'Due Diligence'         && <DueDiligenceTab dealId={id} deal={deal} onRefresh={refreshDeal} />}
            {activeTab === 'Client Communications' && <ClientCommunicationsTab dealId={id} deal={deal} onRefresh={refreshDeal} />}
            {activeTab === 'Notes' && (
              <NotesTab dealId={id} currentUserId={currentUserId} />
            )}
          </div>

        </div>

        {/* Cancel deal — below card, right-aligned */}
        {deal.status !== 'canceled' && deal.status !== 'closed' && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button
              onClick={cancelDeal}
              disabled={canceling}
              style={{
                padding: '9px 20px',
                border: '1px solid #E2E6F0',
                borderRadius: 8,
                background: 'white',
                color: '#0D1B3E',
                fontSize: 13,
                fontWeight: 400,
                fontFamily: 'DM Sans, sans-serif',
                cursor: canceling ? 'not-allowed' : 'pointer',
                opacity: canceling ? 0.6 : 1,
              }}
            >
              {canceling ? 'Canceling…' : 'Cancel Deal'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
