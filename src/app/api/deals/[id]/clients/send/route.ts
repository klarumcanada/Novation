import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

function makeClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
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

function makeAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = makeClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify participant and get deal with seller/buyer names
  const { data: deal } = await supabase
    .from('deals')
    .select(`
      id, seller_id, buyer_id,
      seller:seller_id(full_name),
      buyer:buyer_id(full_name)
    `)
    .eq('id', id)
    .single()

  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  const d = deal as any
  if (d.seller_id !== user.id && d.buyer_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { subject, body } = await req.json()
  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'Subject and body are required' }, { status: 400 })
  }

  const sellerObj = Array.isArray(d.seller) ? d.seller[0] : d.seller
  const buyerObj  = Array.isArray(d.buyer)  ? d.buyer[0]  : d.buyer
  const sellerName = sellerObj?.full_name ?? 'Your advisor'
  const buyerName  = buyerObj?.full_name  ?? 'the new advisor'

  // Fetch clients that haven't been emailed yet
  const admin = makeAdmin()
  const { data: clients, error: clientsError } = await admin
    .from('deal_clients')
    .select('id, client_name, client_email, consent_token')
    .eq('deal_id', id)
    .is('email_sent_at', null)

  if (clientsError) return NextResponse.json({ error: clientsError.message }, { status: 400 })
  if (!clients || clients.length === 0) {
    return NextResponse.json({ error: 'No unsent clients' }, { status: 400 })
  }

  const sent: string[] = []
  const failed: string[] = []

  for (const client of clients) {
    const personalized = body
      .replace(/\[Client Name\]/g, client.client_name)
      .replace(/\[Buyer Name\]/g,  buyerName)
      .replace(/\[Your Name\]/g,   sellerName)

    const emailText = `${personalized}\n\nConsent link:\nhttps://demo.klarum.ca/consent/${client.consent_token}`

    const { error: sendError } = await resend.emails.send({
      from:    'Novation <hello@klarum.ca>',
      to:      client.client_email,
      subject: subject.trim(),
      text:    emailText,
    })

    if (sendError) {
      console.error(`Failed to send to ${client.client_email}:`, sendError)
      failed.push(client.id)
      continue
    }

    await admin
      .from('deal_clients')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', client.id)

    sent.push(client.id)
  }

  return NextResponse.json({ sent: sent.length, failed: failed.length })
}
