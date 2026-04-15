import { createServerClient } from '@supabase/ssr'
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
    .select('id, status, seller_id, buyer_id')
    .eq('id', id)
    .single()

  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  const isSeller = deal.seller_id === user.id
  const isBuyer  = deal.buyer_id  === user.id
  if (!isSeller && !isBuyer) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  if (deal.status === 'canceled') {
    return NextResponse.json({ error: 'Deal is already canceled' }, { status: 400 })
  }
  if (deal.status === 'closed') {
    return NextResponse.json({ error: 'A closed deal cannot be canceled' }, { status: 400 })
  }

  const { data: updated, error } = await supabase
    .from('deals')
    .update({ status: 'canceled' })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ deal: updated })
}
