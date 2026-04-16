import { createServerClient } from '@supabase/ssr'
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = makeClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch deal and verify MGA access
  const { data: deal } = await supabase
    .from('deals')
    .select('seller_id, mga_id')
    .eq('id', id)
    .single()

  if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: mgaUser } = await supabase
    .from('mga_users')
    .select('id')
    .eq('user_id', user.id)
    .eq('mga_id', deal.mga_id)
    .single()

  if (!mgaUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  // Find valuation by deal_id first, fall back to seller's advisor_id
  let valuation = null

  const { data: byDeal } = await supabase
    .from('book_valuations')
    .select('*')
    .eq('deal_id', id)
    .maybeSingle()

  if (byDeal) {
    valuation = byDeal
  } else {
    const { data: bySeller } = await supabase
      .from('book_valuations')
      .select('*')
      .eq('advisor_id', deal.seller_id)
      .maybeSingle()
    valuation = bySeller
  }

  if (!valuation) return NextResponse.json(null)
  return NextResponse.json(valuation)
}
