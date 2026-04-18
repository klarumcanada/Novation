import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

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

async function verifyParticipant(supabase: ReturnType<typeof makeClient>, dealId: string, userId: string) {
  const { data: deal } = await supabase
    .from('deals')
    .select('seller_id, buyer_id')
    .eq('id', dealId)
    .single()
  if (!deal) return null
  if (deal.seller_id !== userId && deal.buyer_id !== userId) return null
  return deal
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = makeClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const deal = await verifyParticipant(supabase, id, user.id)
  if (!deal) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  // Auth + participant check done above — use admin client so RLS doesn't
  // silently block rows that were inserted via admin on the write path.
  const admin = makeAdmin()
  const { data: clients, error } = await admin
    .from('deal_clients')
    .select('id, client_name, client_email, carrier, policy_id, consent_status, consent_responded_at, email_sent_at, created_at')
    .eq('deal_id', id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ clients })
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

  const deal = await verifyParticipant(supabase, id, user.id)
  if (!deal) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const body = await req.json()
  const rows = Array.isArray(body) ? body : [body]

  const inserts = rows
    .filter(r => r.client_name?.trim() && r.client_email?.trim())
    .map(r => ({
      deal_id:      id,
      client_name:  r.client_name.trim(),
      client_email: r.client_email.trim(),
    }))

  if (inserts.length === 0) {
    return NextResponse.json({ error: 'No valid clients provided' }, { status: 400 })
  }

  // Use admin client to bypass RLS — auth + participant check already done above
  const admin = makeAdmin()
  const { data: clients, error } = await admin
    .from('deal_clients')
    .insert(inserts)
    .select('id, client_name, client_email, consent_status, consent_responded_at, email_sent_at, created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ clients }, { status: 201 })
}
