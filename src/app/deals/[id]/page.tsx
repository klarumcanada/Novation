'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
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
                    border: otherConfirmed ? 'none' : `1px solid ${BRAND.border}`,
                    borderRadius: 8,
                    background: otherConfirmed ? BRAND.midnight : 'white',
                    color: otherConfirmed ? 'white' : BRAND.midnight,
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

function ConsentPill({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    pending:   { bg: '#F3F4F6', color: '#6B7280', label: 'Pending' },
    consented: { bg: '#D1FAE5', color: '#065F46', label: 'Consented' },
    refused:   { bg: '#FEE2E2', color: '#991B1B', label: 'Refused'  },
  }
  const s = styles[status] ?? styles.pending
  return (
    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  )
}

function ClientCommunicationsTab({ dealId, deal, onRefresh }: { dealId: string; deal: any; onRefresh: () => void }) {
  const [clients, setClients]         = useState<DealClient[]>([])
  const [loading, setLoading]         = useState(true)
  const [addMode, setAddMode]         = useState<'single' | 'csv' | null>(null)
  const [singleName, setSingleName]   = useState('')
  const [singleEmail, setSingleEmail] = useState('')
  const [addingClient, setAddingClient] = useState(false)
  const [subject, setSubject]         = useState(DEFAULT_SUBJECT)
  const [body, setBody]               = useState(DEFAULT_BODY)
  const [sending, setSending]         = useState(false)
  const [submitting, setSubmitting]   = useState(false)

  useEffect(() => {
    fetch(`/api/deals/${dealId}/clients`)
      .then(r => r.json())
      .then(d => { if (d.clients) setClients(d.clients) })
      .finally(() => setLoading(false))
  }, [dealId])

  async function addSingleClient() {
    if (!singleName.trim() || !singleEmail.trim()) return
    setAddingClient(true)
    const res  = await fetch(`/api/deals/${dealId}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_name: singleName.trim(), client_email: singleEmail.trim() }),
    })
    const data = await res.json()
    if (data.clients) {
      setClients(prev => [...prev, ...data.clients])
      setSingleName(''); setSingleEmail(''); setAddMode(null)
    } else {
      alert(data.error ?? 'Failed to add client.')
    }
    setAddingClient(false)
  }

  async function handleCSV(file: File) {
    const parsed = parseCSV(await file.text())
    if (parsed.length === 0) {
      alert('Could not parse CSV. Make sure it has "name" and "email" columns.')
      return
    }
    setAddingClient(true)
    const res  = await fetch(`/api/deals/${dealId}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed),
    })
    const data = await res.json()
    if (data.clients) {
      setClients(prev => [...prev, ...data.clients])
      setAddMode(null)
    } else {
      alert(data.error ?? 'Failed to import clients.')
    }
    setAddingClient(false)
  }

  async function sendEmails() {
    setSending(true)
    const res  = await fetch(`/api/deals/${dealId}/clients/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, body }),
    })
    const data = await res.json()
    if (res.ok) {
      const fresh = await fetch(`/api/deals/${dealId}/clients`).then(r => r.json())
      if (fresh.clients) setClients(fresh.clients)
    } else {
      alert(data.error ?? 'Failed to send emails.')
    }
    setSending(false)
  }

  async function markCCComplete() {
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

  const anyEmailSent   = clients.some(c => c.email_sent_at)
  const anyUnsent      = clients.some(c => !c.email_sent_at)
  const allConsented   = clients.length > 0 && clients.every(c => c.consent_status === 'consented')
  const pendingCount   = clients.filter(c => c.consent_status === 'pending').length
  const consentedCount = clients.filter(c => c.consent_status === 'consented').length
  const refusedCount   = clients.filter(c => c.consent_status === 'refused').length

  const myConfirmed    = deal.is_seller ? deal.cc_complete_seller : deal.cc_complete_buyer
  const otherConfirmed = deal.is_seller ? deal.cc_complete_buyer  : deal.cc_complete_seller
  const otherParty     = deal.is_seller ? deal.buyer : deal.seller
  const otherFirst     = otherParty?.full_name?.split(' ')[0] ?? 'the other party'

  return (
    <div style={{ padding: '28px 32px' }}>

      {/* ── Section 1: Client list ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 14 }}>
          Your clients
        </div>

        {/* Add-mode buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {(['single', 'csv'] as const).map(mode => {
            const label = mode === 'single' ? 'Add one by one' : 'Upload CSV'
            const active = addMode === mode
            return (
              <button
                key={mode}
                onClick={() => setAddMode(active ? null : mode)}
                style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${BRAND.border}`, background: active ? BRAND.midnight : 'white', color: active ? 'white' : BRAND.midnight, fontSize: 13, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}
              >
                {label}
              </button>
            )
          })}
          <button disabled style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${BRAND.border}`, background: 'white', color: '#C4C4C4', fontSize: 13, fontFamily: 'DM Sans, sans-serif', cursor: 'not-allowed' }}>
            MGA import&nbsp;<span style={{ fontSize: 10 }}>Coming soon</span>
          </button>
        </div>

        {/* Single add form */}
        {addMode === 'single' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <input
              type="text" value={singleName} onChange={e => setSingleName(e.target.value)}
              placeholder="Client name"
              style={{ flex: 1, minWidth: 160, padding: '9px 12px', borderRadius: 8, border: `1px solid ${BRAND.border}`, fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: BRAND.midnight, outline: 'none' }}
            />
            <input
              type="email" value={singleEmail} onChange={e => setSingleEmail(e.target.value)}
              placeholder="Email address"
              onKeyDown={e => e.key === 'Enter' && addSingleClient()}
              style={{ flex: 1, minWidth: 160, padding: '9px 12px', borderRadius: 8, border: `1px solid ${BRAND.border}`, fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: BRAND.midnight, outline: 'none' }}
            />
            <button
              onClick={addSingleClient}
              disabled={addingClient || !singleName.trim() || !singleEmail.trim()}
              style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: BRAND.midnight, color: 'white', fontSize: 13, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {addingClient ? '…' : 'Add'}
            </button>
          </div>
        )}

        {/* CSV upload */}
        {addMode === 'csv' && (
          <div style={{ marginBottom: 16 }}>
            <input
              type="file" accept=".csv,text/csv"
              onChange={e => { if (e.target.files?.[0]) handleCSV(e.target.files[0]); e.target.value = '' }}
              style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13 }}
            />
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>
              CSV must have "name" and "email" columns.
            </div>
          </div>
        )}

        {/* Client rows */}
        {clients.length === 0 ? (
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9CA3AF', margin: 0 }}>
            No clients added yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {clients.map(client => (
              <div key={client.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: `1px solid ${BRAND.border}`, borderRadius: 10, background: 'white' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 500, color: BRAND.midnight }}>{client.client_name}</div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{client.client_email}</div>
                </div>
                <ConsentPill status={client.consent_status} />
                {client.email_sent_at && (
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                    Sent {new Date(client.email_sent_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Section 2: Email template ── */}
      {clients.length > 0 && (
        <div style={{ borderTop: `1px solid ${BRAND.border}`, paddingTop: 28, marginBottom: 32 }}>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 14 }}>
            Email template
          </div>
          <input
            type="text" value={subject} onChange={e => setSubject(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', marginBottom: 10, border: `1px solid ${BRAND.border}`, borderRadius: 8, fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 500, color: BRAND.midnight, outline: 'none' }}
          />
          <textarea
            value={body} onChange={e => setBody(e.target.value)} rows={12}
            style={{ width: '100%', boxSizing: 'border-box', padding: '12px', border: `1px solid ${BRAND.border}`, borderRadius: 8, fontFamily: 'DM Mono, monospace', fontSize: 12, color: BRAND.midnight, resize: 'vertical', outline: 'none', lineHeight: 1.75, marginBottom: 10 }}
          />
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#9CA3AF', marginBottom: 16 }}>
            [Client Name] and [Buyer Name] will be personalized automatically for each recipient.
          </div>
          <button
            onClick={sendEmails}
            disabled={sending || !anyUnsent}
            style={{ padding: '10px 22px', border: 'none', borderRadius: 8, background: anyUnsent ? BRAND.midnight : '#E5E7EB', color: anyUnsent ? 'white' : '#9CA3AF', fontSize: 13, fontWeight: 500, fontFamily: 'DM Sans, sans-serif', cursor: anyUnsent && !sending ? 'pointer' : 'not-allowed' }}
          >
            {sending ? 'Sending…' : 'Send to all'}
          </button>
        </div>
      )}

      {/* ── Section 3: Consent summary ── */}
      {anyEmailSent && (
        <div style={{ borderTop: `1px solid ${BRAND.border}`, paddingTop: 28 }}>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 14 }}>
            Consent summary
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
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
                  disabled={submitting || !allConsented}
                  style={{
                    padding: '9px 20px', borderRadius: 8,
                    border: otherConfirmed ? 'none' : `1px solid ${BRAND.border}`,
                    background: otherConfirmed ? BRAND.midnight : 'white',
                    color: otherConfirmed ? 'white' : BRAND.midnight,
                    fontSize: 13, fontWeight: 400, fontFamily: 'DM Sans, sans-serif',
                    cursor: submitting || !allConsented ? 'not-allowed' : 'pointer',
                    opacity: !allConsented ? 0.5 : 1,
                    marginBottom: 8,
                  }}
                >
                  {submitting ? 'Saving…' : 'Mark client communications complete'}
                </button>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#9CA3AF' }}>
                  {otherConfirmed
                    ? `${otherFirst} has marked client communications complete. Confirm to advance.`
                    : 'Both parties must confirm to advance to Book Transfer.'
                  }
                </div>
              </>
            )
          )}
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
