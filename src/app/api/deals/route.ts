import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

function makeSupabase(cookieStore: Awaited<ReturnType<typeof cookies>>) {
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

// GET /api/deals — fetch all deals for the current user
export async function GET() {
  const cookieStore = await cookies()
  const supabase = makeSupabase(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('deals')
    .select('id, status, seller_confirmed_next, buyer_confirmed_next, initiator_id, created_at, updated_at, thread_id, seller_id, buyer_id, mga_id')
    .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const allIds = [...new Set((data ?? []).flatMap(d => [d.seller_id, d.buyer_id]))]
  const { data: advisors } = await supabase
    .from('advisors')
    .select('id, full_name')
    .in('id', allIds)

  const advisorMap = Object.fromEntries((advisors ?? []).map(a => [a.id, a.full_name]))

  const hydrated = (data ?? []).map(deal => ({
    ...deal,
    seller: { id: deal.seller_id, full_name: advisorMap[deal.seller_id] ?? 'Unknown' },
    buyer: { id: deal.buyer_id, full_name: advisorMap[deal.buyer_id] ?? 'Unknown' },
    is_seller: deal.seller_id === user.id,
    is_initiator: deal.initiator_id === user.id,
    my_confirmed: deal.seller_id === user.id ? deal.seller_confirmed_next : deal.buyer_confirmed_next,
    their_confirmed: deal.seller_id === user.id ? deal.buyer_confirmed_next : deal.seller_confirmed_next,
  }))

  return NextResponse.json(hydrated)
}

// POST /api/deals — create a new deal (either party can initiate)
export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = makeSupabase(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { other_id, thread_id } = await request.json()
  if (!other_id) return NextResponse.json({ error: 'Missing other_id' }, { status: 400 })

  const { data: me } = await supabase
    .from('advisors')
    .select('id, intent, mga_id')
    .eq('id', user.id)
    .single()

  const { data: other } = await supabase
    .from('advisors')
    .select('id, intent, mga_id')
    .eq('id', other_id)
    .single()

  if (!me || !other) return NextResponse.json({ error: 'Advisor not found' }, { status: 404 })

  // Determine seller/buyer from intent — initiator may be either
  const seller_id = me.intent === 'selling' ? me.id : other.id
  const buyer_id  = me.intent === 'selling' ? other.id : me.id

  const mga_id = me.mga_id
  if (!mga_id) return NextResponse.json({ error: 'No MGA associated with your account' }, { status: 400 })

  const { data: existing } = await supabase
    .from('deals')
    .select('id, status')
    .eq('seller_id', seller_id)
    .eq('buyer_id', buyer_id)
    .maybeSingle()

  if (existing) return NextResponse.json({ deal: existing, already_exists: true })

  const { data: deal, error } = await supabase
    .from('deals')
    .insert({
      seller_id,
      buyer_id,
      mga_id,
      thread_id: thread_id ?? null,
      initiator_id: user.id,
      status: 'interested',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ deal, already_exists: false })
}