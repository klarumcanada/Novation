'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'

const BRAND = {
  midnight: '#0D1B3E',
  electric: '#3B82F6',
  voltage: '#E8C547',
  linen: '#F0EDE7',
  border: '#E2E6F0',
  stepNum: '#C5CDE8',
  navy: '#1A3266',
}

// ─── Canned LOI Template ──────────────────────────────────────────────────────
function cannedTemplate(sellerName: string, buyerName: string, date: string) {
  return `LETTER OF INTENT

Date: ${date}

This Letter of Intent ("LOI") is entered into between:

Seller: ${sellerName}
Buyer: ${buyerName}

The parties have agreed in principle to explore the succession and transfer of the Seller's book of business (the "Book") under the following non-binding terms:

1. INTENT TO PURCHASE
The Buyer expresses a sincere intent to acquire the Book from the Seller, subject to satisfactory completion of due diligence and execution of a formal Purchase Agreement.

2. EXCLUSIVITY PERIOD
Upon signing of this LOI, both parties agree to a 60-day exclusivity period during which the Seller will not solicit or entertain offers from other prospective buyers.

3. INDICATIVE TERMS
The final purchase price and payment structure will be negotiated following due diligence. Indicative terms discussed between the parties prior to this LOI may be reflected in the subsequent Purchase Agreement.

4. DUE DILIGENCE
The Buyer will be provided reasonable access to client data, revenue history, carrier relationships, and other relevant business information required to assess the Book. All information shared shall be treated as strictly confidential.

5. NON-BINDING NATURE
This LOI is non-binding and does not constitute a binding contract. The parties acknowledge that a formal Purchase Agreement will be required to complete the transaction.

6. CONFIDENTIALITY
Both parties agree to keep the terms of this LOI and all related discussions strictly confidential.

7. GOVERNING LAW
This LOI is governed by the laws of the Province of Ontario, Canada.

Both parties acknowledge they have read, understood, and agreed to proceed in good faith under the terms described above.`
}

// ─── Signature Pad ───────────────────────────────────────────────────────────
function SignaturePad({ onSave }: { onSave: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [mode, setMode] = useState<'draw' | 'type'>('draw')
  const [typedName, setTypedName] = useState('')
  const [hasDrawn, setHasDrawn] = useState(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const ctx = canvasRef.current!.getContext('2d')!
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    lastPos.current = pos
    setIsDrawing(true)
    setHasDrawn(true)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    e.preventDefault()
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = BRAND.midnight
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPos.current = pos
  }

  const stopDraw = () => setIsDrawing(false)

  const clearCanvas = () => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  const renderTypedSig = useCallback(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.font = 'italic 42px "Dancing Script", "Brush Script MT", cursive'
    ctx.fillStyle = BRAND.midnight
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(typedName, canvas.width / 2, canvas.height / 2)
    setHasDrawn(!!typedName)
  }, [typedName])

  useEffect(() => {
    if (mode === 'type') renderTypedSig()
  }, [typedName, mode, renderTypedSig])

  const handleSave = () => {
    const canvas = canvasRef.current!
    const dataUrl = canvas.toDataURL('image/png')
    onSave(dataUrl)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: 0, border: `1px solid ${BRAND.border}`, borderRadius: 8, overflow: 'hidden', width: 'fit-content' }}>
        {(['draw', 'type'] as const).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); clearCanvas(); setTypedName('') }}
            style={{
              padding: '7px 18px',
              border: 'none',
              background: mode === m ? BRAND.midnight : 'white',
              color: mode === m ? 'white' : BRAND.midnight,
              fontSize: 13,
              fontFamily: 'DM Sans, sans-serif',
              cursor: 'pointer',
              fontWeight: mode === m ? 600 : 400,
            }}
          >
            {m === 'draw' ? 'Draw' : 'Type'}
          </button>
        ))}
      </div>

      {mode === 'type' && (
        <input
          value={typedName}
          onChange={e => setTypedName(e.target.value)}
          placeholder="Type your full name"
          style={{
            padding: '10px 14px',
            border: `1px solid ${BRAND.border}`,
            borderRadius: 8,
            fontSize: 15,
            fontFamily: 'DM Sans, sans-serif',
            outline: 'none',
            color: BRAND.midnight,
          }}
        />
      )}

      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={500}
          height={140}
          onMouseDown={mode === 'draw' ? startDraw : undefined}
          onMouseMove={mode === 'draw' ? draw : undefined}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={mode === 'draw' ? startDraw : undefined}
          onTouchMove={mode === 'draw' ? draw : undefined}
          onTouchEnd={stopDraw}
          style={{
            width: '100%',
            height: 140,
            border: `1px solid ${BRAND.border}`,
            borderRadius: 8,
            background: '#FAFBFF',
            cursor: mode === 'draw' ? 'crosshair' : 'default',
            touchAction: 'none',
            display: 'block',
          }}
        />
        {mode === 'draw' && !hasDrawn && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            color: '#CBD5E1',
            fontSize: 14,
            fontFamily: 'DM Sans, sans-serif',
          }}>
            Sign here
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={clearCanvas}
          style={{
            padding: '8px 16px',
            border: `1px solid ${BRAND.border}`,
            borderRadius: 8,
            background: 'white',
            color: BRAND.midnight,
            fontSize: 13,
            fontFamily: 'DM Sans, sans-serif',
            cursor: 'pointer',
          }}
        >
          Clear
        </button>
        <button
          onClick={handleSave}
          disabled={!hasDrawn}
          style={{
            padding: '8px 20px',
            border: 'none',
            borderRadius: 8,
            background: hasDrawn ? BRAND.electric : '#CBD5E1',
            color: 'white',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'DM Sans, sans-serif',
            cursor: hasDrawn ? 'pointer' : 'not-allowed',
          }}
        >
          Apply Signature
        </button>
      </div>
    </div>
  )
}

// ─── Signature Block ─────────────────────────────────────────────────────────
function SignatureBlock({
  label,
  name,
  isMe,
  signed,
  signedAt,
  sigData,
  onSign,
  disabled,
}: {
  label: string
  name: string
  isMe: boolean
  signed: boolean
  signedAt: string | null
  sigData: string | null
  onSign: (dataUrl: string) => void
  disabled: boolean
}) {
  const [showPad, setShowPad] = useState(false)

  const handleSave = (dataUrl: string) => {
    setShowPad(false)
    onSign(dataUrl)
  }

  return (
    <div style={{
      flex: 1,
      border: `1px solid ${BRAND.border}`,
      borderRadius: 12,
      padding: 24,
      background: signed ? '#F0FDF4' : 'white',
      minWidth: 0,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: BRAND.stepNum, textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: BRAND.midnight, marginBottom: 12 }}>
        {name}
      </div>

      {signed && sigData ? (
        <div>
          <img src={sigData} alt="Signature" style={{ maxHeight: 80, maxWidth: '100%', marginBottom: 8 }} />
          <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>
            Signed {signedAt ? new Date(signedAt).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
          </div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
            <span style={{ fontSize: 13, color: '#16A34A', fontWeight: 600 }}>Signed</span>
          </div>
        </div>
      ) : isMe && !disabled ? (
        <div>
          {!showPad ? (
            <button
              onClick={() => setShowPad(true)}
              style={{
                padding: '10px 20px',
                border: `1px solid ${BRAND.electric}`,
                borderRadius: 8,
                background: 'white',
                color: BRAND.electric,
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'DM Sans, sans-serif',
                cursor: 'pointer',
              }}
            >
              Sign this LOI
            </button>
          ) : (
            <SignaturePad onSave={handleSave} />
          )}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }}>
          Awaiting signature
        </div>
      )}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function LOIPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [deal, setDeal] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)
  const [signing, setSigning] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [bothSigned, setBothSigned] = useState(false)

  const fetchDeal = useCallback(async () => {
    const res = await fetch(`/api/deals/${id}/loi`)
    const data = await res.json()
    if (data.deal) {
      setDeal(data.deal)
      setBothSigned(data.deal.loi_seller_signed && data.deal.loi_buyer_signed)
    }
  }, [id])

  const fetchUser = useCallback(async () => {
    const res = await fetch('/api/me')
    const data = await res.json()
    if (data.user) setCurrentUserId(data.user.id)
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchDeal(), fetchUser()]).finally(() => setLoading(false))
  }, [fetchDeal, fetchUser])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: BRAND.linen, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif', color: BRAND.midnight }}>
      Loading…
    </div>
  )

  if (!deal) return (
    <div style={{ minHeight: '100vh', background: BRAND.linen, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif', color: BRAND.midnight }}>
      Deal not found.
    </div>
  )

  // Supabase drops seller_id/buyer_id when aliased as join targets — compare via nested object
  const sellerObj = Array.isArray(deal.seller) ? deal.seller[0] : deal.seller
  const buyerObj  = Array.isArray(deal.buyer)  ? deal.buyer[0]  : deal.buyer
  const isSeller = sellerObj?.id === currentUserId
  const isBuyer  = buyerObj?.id  === currentUserId
  const today = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
  const loiText = deal.loi_text || cannedTemplate(sellerObj?.full_name ?? 'Seller', buyerObj?.full_name ?? 'Buyer', today)
  const bothSignedNow = deal.loi_seller_signed && deal.loi_buyer_signed

  const startEdit = () => {
    setEditText(loiText)
    setEditing(true)
  }

  const saveEdit = async () => {
    setSaving(true)
    const res = await fetch(`/api/deals/${id}/loi`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loi_text: editText }),
    })
    const data = await res.json()
    setSaving(false)
    if (data.deal) {
      setDeal(data.deal)
      setEditing(false)
      if (data.signaturesReset) setSaveMsg('LOI saved. Any existing signatures have been reset.')
      else setSaveMsg('LOI saved.')
      setTimeout(() => setSaveMsg(''), 4000)
    }
  }

  const handleSign = async (sigData: string) => {
    setSigning(true)
    const res = await fetch(`/api/deals/${id}/loi/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sig_data: sigData }),
    })
    const data = await res.json()
    setSigning(false)
    if (data.deal) {
      setDeal(data.deal)
      if (data.bothSigned) setBothSigned(true)
    }
  }

  const downloadPDF = async () => {
    const res = await fetch(`/api/deals/${id}/loi/pdf`)
    if (!res.ok) { alert('PDF generation failed'); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `LOI-${sellerObj?.full_name?.replace(/\s+/g, '-')}-${buyerObj?.full_name?.replace(/\s+/g, '-')}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ minHeight: '100vh', background: BRAND.linen, fontFamily: 'DM Sans, sans-serif' }}>
      {/* Header */}
      <div style={{ background: BRAND.midnight, padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={() => router.push('/deals')}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 14, padding: 0 }}
        >
          ← Deals
        </button>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
        <span style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>Letter of Intent</span>
        <span style={{ marginLeft: 'auto', background: bothSignedNow ? '#16A34A' : BRAND.electric, color: 'white', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase' }}>
          {bothSignedNow ? 'Fully Executed' : 'Pending Signatures'}
        </span>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {/* Parties */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Seller', name: sellerObj?.full_name },
            { label: 'Buyer', name: buyerObj?.full_name },
          ].map(({ label, name }) => (
            <div key={label} style={{ flex: 1, background: 'white', border: `1px solid ${BRAND.border}`, borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: BRAND.stepNum, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: BRAND.midnight }}>{name}</div>
            </div>
          ))}
        </div>

        {/* LOI Document */}
        <div style={{ background: 'white', border: `1px solid ${BRAND.border}`, borderRadius: 12, marginBottom: 24 }}>
          {/* Doc header */}
          <div style={{ padding: '18px 24px', borderBottom: `1px solid ${BRAND.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: BRAND.midnight }}>Letter of Intent</div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Review and edit before signing</div>
            </div>
            {!bothSignedNow && !editing && (
              <button
                onClick={startEdit}
                style={{
                  padding: '8px 16px',
                  border: `1px solid ${BRAND.border}`,
                  borderRadius: 8,
                  background: 'white',
                  color: BRAND.midnight,
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                ✏️ Edit
              </button>
            )}
          </div>

          {/* Doc body */}
          <div style={{ padding: '28px 32px' }}>
            {editing ? (
              <div>
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: 480,
                    padding: 16,
                    border: `1px solid ${BRAND.border}`,
                    borderRadius: 8,
                    fontSize: 14,
                    lineHeight: 1.7,
                    fontFamily: 'monospace',
                    color: BRAND.midnight,
                    resize: 'vertical',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center' }}>
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    style={{
                      padding: '9px 20px',
                      border: 'none',
                      borderRadius: 8,
                      background: BRAND.electric,
                      color: 'white',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    style={{
                      padding: '9px 20px',
                      border: `1px solid ${BRAND.border}`,
                      borderRadius: 8,
                      background: 'white',
                      color: BRAND.midnight,
                      fontSize: 13,
                      cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <pre style={{
                fontSize: 14,
                lineHeight: 1.8,
                color: BRAND.midnight,
                whiteSpace: 'pre-wrap',
                fontFamily: 'Georgia, serif',
                margin: 0,
              }}>
                {loiText}
              </pre>
            )}
          </div>
        </div>

        {saveMsg && (
          <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#92400E' }}>
            {saveMsg}
          </div>
        )}

        {/* Signature blocks */}
        {!editing && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: BRAND.midnight, marginBottom: 14 }}>Signatures</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <SignatureBlock
                label="Seller"
                name={sellerObj?.full_name ?? ''}
                isMe={isSeller}
                signed={deal.loi_seller_signed}
                signedAt={deal.loi_seller_signed_at}
                sigData={deal.loi_seller_sig_data}
                onSign={handleSign}
                disabled={signing}
              />
              <SignatureBlock
                label="Buyer"
                name={buyerObj?.full_name ?? ''}
                isMe={isBuyer}
                signed={deal.loi_buyer_signed}
                signedAt={deal.loi_buyer_signed_at}
                sigData={deal.loi_buyer_sig_data}
                onSign={handleSign}
                disabled={signing}
              />
            </div>
          </div>
        )}

        {/* Fully executed banner */}
        {bothSignedNow && (
          <div style={{
            marginTop: 28,
            background: '#F0FDF4',
            border: '1px solid #86EFAC',
            borderRadius: 12,
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#15803D', marginBottom: 4 }}>
                ✅ LOI Fully Executed
              </div>
              <div style={{ fontSize: 13, color: '#16A34A' }}>
                Both parties have signed. This deal has moved to Due Diligence.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={downloadPDF}
                style={{
                  padding: '10px 22px',
                  border: 'none',
                  borderRadius: 8,
                  background: BRAND.midnight,
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                ↓ Download PDF
              </button>
              <button
                onClick={() => router.push('/deals')}
                style={{
                  padding: '10px 22px',
                  border: `1px solid ${BRAND.border}`,
                  borderRadius: 8,
                  background: 'white',
                  color: BRAND.midnight,
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                Back to Deals
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}