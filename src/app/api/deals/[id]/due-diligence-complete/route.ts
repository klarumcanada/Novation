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

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = makeClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: deal } = await supabase
    .from('deals')
    .select('id, status, seller_id, buyer_id, dd_complete_seller, dd_complete_buyer')
    .eq('id', id)
    .single()

  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  const isSeller = deal.seller_id === user.id
  const isBuyer  = deal.buyer_id  === user.id
  if (!isSeller && !isBuyer) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  if (deal.status !== 'due_diligence') {
    return NextResponse.json({ error: 'Deal is not in due diligence stage' }, { status: 400 })
  }

  const myField    = isSeller ? 'dd_complete_seller' : 'dd_complete_buyer'
  const otherDone  = isSeller ? deal.dd_complete_buyer : deal.dd_complete_seller

  if (otherDone) {
    // Both confirmed — advance to client_communication and reset flags
    const { data: updated, error } = await supabase
      .from('deals')
      .update({
        status:               'client_communication',
        dd_complete_seller:   false,
        dd_complete_buyer:    false,
        seller_confirmed_next: false,
        buyer_confirmed_next:  false,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ deal: updated, advanced: true, new_status: 'client_communication' })
  }

  // Only this party confirmed so far
  const { data: updated, error } = await supabase
    .from('deals')
    .update({ [myField]: true })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ deal: updated, advanced: false })
}
