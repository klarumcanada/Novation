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

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = makeClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: deal } = await supabase
    .from('deals')
    .select('id, status, seller_id, buyer_id, cc_complete_seller, cc_complete_buyer')
    .eq('id', id)
    .single()

  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  const isSeller = deal.seller_id === user.id
  const isBuyer  = deal.buyer_id  === user.id
  if (!isSeller && !isBuyer) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  if (deal.status !== 'client_communication') {
    return NextResponse.json({ error: 'Deal is not in client communications stage' }, { status: 400 })
  }

  // All clients must have consented before either party can confirm
  const admin = makeAdmin()
  const { data: clients } = await admin
    .from('deal_clients')
    .select('consent_status')
    .eq('deal_id', id)

  const allConsented = (clients ?? []).length > 0 && (clients ?? []).every(c => c.consent_status === 'consented')
  if (!allConsented) {
    return NextResponse.json({ error: 'All clients must consent before advancing' }, { status: 400 })
  }

  const myField   = isSeller ? 'cc_complete_seller' : 'cc_complete_buyer'
  const otherDone = isSeller ? deal.cc_complete_buyer : deal.cc_complete_seller

  if (otherDone) {
    const { data: updated, error } = await supabase
      .from('deals')
      .update({
        status:                'book_transfer',
        cc_complete_seller:    false,
        cc_complete_buyer:     false,
        seller_confirmed_next: false,
        buyer_confirmed_next:  false,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ deal: updated, advanced: true, new_status: 'book_transfer' })
  }

  const { data: updated, error } = await supabase
    .from('deals')
    .update({ [myField]: true })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ deal: updated, advanced: false })
}
