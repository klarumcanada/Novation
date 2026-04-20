import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    .select('id, status, seller_id')
    .eq('id', id)
    .single()

  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  if (deal.seller_id !== user.id) return NextResponse.json({ error: 'Only the seller can share the valuation' }, { status: 403 })
  if (deal.status !== 'valuation_pending') return NextResponse.json({ error: 'Deal is not in valuation_pending stage' }, { status: 400 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Mark the valuation as shared (try deal_id match first, fall back to seller's profile valuation)
  const { data: byDeal } = await admin
    .from('book_valuations')
    .select('id')
    .eq('deal_id', id)
    .maybeSingle()

  const valuationId = byDeal?.id ?? (await admin
    .from('book_valuations')
    .select('id')
    .eq('advisor_id', user.id)
    .maybeSingle()
    .then(r => r.data?.id))

  if (valuationId) {
    await admin
      .from('book_valuations')
      .update({ shared_with_buyer: true, updated_at: new Date().toISOString() })
      .eq('id', valuationId)
  }

  const { data: updated, error } = await supabase
    .from('deals')
    .update({ status: 'valuation_shared', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ deal: updated })
}