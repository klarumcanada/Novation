import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const STAGE_ORDER = ['interested', 'loi', 'due_diligence', 'closed']

function nextStage(current: string) {
  const idx = STAGE_ORDER.indexOf(current)
  return idx >= 0 && idx < STAGE_ORDER.length - 1 ? STAGE_ORDER[idx + 1] : null
}

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
    .select('id, status, seller_id, buyer_id, seller_confirmed_next, buyer_confirmed_next')
    .eq('id', id)
    .single()

  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  const isSeller = deal.seller_id === user.id
  const isBuyer = deal.buyer_id === user.id
  if (!isSeller && !isBuyer) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const updateField = isSeller ? 'seller_confirmed_next' : 'buyer_confirmed_next'
  const otherConfirmed = isSeller ? deal.buyer_confirmed_next : deal.seller_confirmed_next

  if (otherConfirmed) {
    const next = nextStage(deal.status)
    if (!next) return NextResponse.json({ error: 'Already at final stage' }, { status: 400 })

    const { data: updated, error } = await supabase
      .from('deals')
      .update({
        status: next,
        seller_confirmed_next: false,
        buyer_confirmed_next: false,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ deal: updated, advanced: true, new_status: next })
  }

  const { data: updated, error } = await supabase
    .from('deals')
    .update({ [updateField]: true })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ deal: updated, advanced: false })
}