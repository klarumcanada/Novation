import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

function supabaseClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  )
}

function dataUrlToBytes(dataUrl: string): Buffer {
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
  return Buffer.from(base64, 'base64')
}

function getName(party: unknown): string {
  if (!party) return ''
  if (Array.isArray(party)) return (party[0] as any)?.full_name ?? ''
  return (party as any).full_name ?? ''
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = supabaseClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: raw } = await supabase
    .from('deals')
    .select(`
      id, status, loi_text,
      seller_id, buyer_id,
      loi_seller_signed, loi_buyer_signed,
      loi_seller_signed_at, loi_buyer_signed_at,
      loi_seller_sig_data, loi_buyer_sig_data,
      seller:seller_id(id, full_name),
      buyer:buyer_id(id, full_name)
    `)
    .eq('id', id)
    .single()

  if (!raw) return new NextResponse('Not found', { status: 404 })

  // Cast to any to avoid Supabase's auto-generated type narrowing on joined columns
  const deal = raw as any

  if (deal.seller_id !== user.id && deal.buyer_id !== user.id) {
    return new NextResponse('Unauthorized', { status: 403 })
  }

  if (!deal.loi_seller_signed || !deal.loi_buyer_signed) {
    return new NextResponse('LOI not fully signed', { status: 400 })
  }

  const sellerName = getName(deal.seller)
  const buyerName  = getName(deal.buyer)
  const today      = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
  const loiBody    = deal.loi_text || `LETTER OF INTENT\n\nDate: ${today}\n\nSeller: ${sellerName}\nBuyer: ${buyerName}\n\n[LOI text not found]`

  // ── Build PDF ──────────────────────────────────────────────────────────────
  const pdfDoc     = await PDFDocument.create()
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const timesBold  = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
  const helvetica  = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const midnight = rgb(0.051, 0.106, 0.243)
  const electric = rgb(0.231, 0.510, 0.965)
  const gray     = rgb(0.4, 0.4, 0.4)

  const margin     = 60
  const pageWidth  = 595
  const pageHeight = 842

  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let y    = pageHeight - margin

  // Header bar
  page.drawRectangle({ x: 0, y: pageHeight - 50, width: pageWidth, height: 50, color: midnight })
  page.drawText('NOVATION',         { x: margin,                   y: pageHeight - 33, size: 14, font: timesBold, color: rgb(1, 1, 1) })
  page.drawText('Letter of Intent', { x: pageWidth - margin - 90, y: pageHeight - 33, size: 11, font: helvetica,  color: rgb(0.8, 0.85, 0.95) })

  y = pageHeight - 80

  // Body — word-wrapped
  const bodySize   = 11
  const lineHeight = 16
  const maxWidth   = pageWidth - margin * 2

  for (const rawLine of loiBody.split('\n')) {
    if (rawLine.trim() === '') { y -= lineHeight * 0.6; continue }

    const isHeading = /^[A-Z\s0-9.]+$/.test(rawLine.trim()) && rawLine.trim().length < 60
    const font = isHeading ? timesBold : timesRoman
    const size = isHeading ? 11 : bodySize

    let currentLine = ''
    for (const word of rawLine.split(' ')) {
      const test = currentLine ? currentLine + ' ' + word : word
      if (font.widthOfTextAtSize(test, size) > maxWidth && currentLine) {
        if (y < margin + 80) { page = pdfDoc.addPage([pageWidth, pageHeight]); y = pageHeight - margin }
        page.drawText(currentLine, { x: margin, y, size, font, color: midnight })
        y -= lineHeight
        currentLine = word
      } else {
        currentLine = test
      }
    }
    if (currentLine) {
      if (y < margin + 80) { page = pdfDoc.addPage([pageWidth, pageHeight]); y = pageHeight - margin }
      page.drawText(currentLine, { x: margin, y, size, font, color: midnight })
      y -= lineHeight
    }
  }

  // Signature section
  if (y < 180 + margin) { page = pdfDoc.addPage([pageWidth, pageHeight]); y = pageHeight - margin }

  y -= 24
  page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1, color: rgb(0.86, 0.9, 0.94) })
  y -= 20
  page.drawText('SIGNATURES', { x: margin, y, size: 11, font: timesBold, color: midnight })
  y -= 20

  const colWidth = (pageWidth - margin * 2 - 24) / 2
  const col2x    = margin + colWidth + 24

  page.drawText('SELLER', { x: margin, y, size: 9, font: timesBold, color: electric })
  page.drawText('BUYER',  { x: col2x,  y, size: 9, font: timesBold, color: electric })
  y -= 14

  page.drawText(sellerName, { x: margin, y, size: 11, font: timesBold, color: midnight })
  page.drawText(buyerName,  { x: col2x,  y, size: 11, font: timesBold, color: midnight })
  y -= 16

  const sigY = y - 60
  for (const [sigData, x] of [
    [deal.loi_seller_sig_data as string | null, margin as number],
    [deal.loi_buyer_sig_data  as string | null, col2x  as number],
  ] as [string | null, number][]) {
    if (sigData) {
      try {
        const img  = await pdfDoc.embedPng(dataUrlToBytes(sigData))
        const dims = img.scale(Math.min(colWidth / img.width, 60 / img.height))
        page.drawImage(img, { x, y: sigY, width: dims.width, height: dims.height })
      } catch {
        page.drawLine({ start: { x, y: sigY + 10 }, end: { x: x + colWidth * 0.7, y: sigY + 10 }, thickness: 1, color: midnight })
      }
    }
  }

  y = sigY - 12

  const fmtDate = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }) : ''

  page.drawText(`Date: ${fmtDate(deal.loi_seller_signed_at)}`, { x: margin, y, size: 9, font: helvetica, color: gray })
  page.drawText(`Date: ${fmtDate(deal.loi_buyer_signed_at)}`,  { x: col2x,  y, size: 9, font: helvetica, color: gray })

  // Footer
  page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: 36, color: midnight })
  page.drawText('Generated by Klarum Novation  ·  klarum.ca',  { x: margin,                    y: 18, size: 8, font: helvetica, color: rgb(0.6, 0.65, 0.75) })
  page.drawText(`Document ID: ${id.slice(0, 8).toUpperCase()}`, { x: pageWidth - margin - 110, y: 18, size: 8, font: helvetica, color: rgb(0.6, 0.65, 0.75) })

  // ── Return PDF ─────────────────────────────────────────────────────────────
  const buffer = Buffer.from(await pdfDoc.save())

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="LOI-${id.slice(0, 8)}.pdf"`,
      'Content-Length': buffer.length.toString(),
    },
  })
}