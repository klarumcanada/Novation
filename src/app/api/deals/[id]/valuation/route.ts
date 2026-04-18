import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: deal } = await supabase
    .from('deals')
    .select('id, seller_id, buyer_id')
    .eq('id', id)
    .single()

  if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isSeller = deal.seller_id === user.id
  const isBuyer  = deal.buyer_id  === user.id
  if (!isSeller && !isBuyer) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  // Use admin client so RLS doesn't block reads on book_valuations
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Try deal_id first (valuation created during this deal), fall back to seller's profile valuation
  const { data: byDeal } = await admin
    .from('book_valuations')
    .select('*')
    .eq('deal_id', id)
    .maybeSingle()

  let valuation: Record<string, unknown> | null = byDeal ?? null

  if (!valuation) {
    const { data: bySeller } = await admin
      .from('book_valuations')
      .select('*')
      .eq('advisor_id', deal.seller_id)
      .maybeSingle()
    valuation = bySeller ?? null
  }

  if (!valuation) return NextResponse.json(null)

  // Buyer only sees the valuation once the seller has shared it
  if (isBuyer && !valuation.shared_with_buyer) return NextResponse.json(null)

  return NextResponse.json(valuation)
}
