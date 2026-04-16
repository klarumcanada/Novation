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

  // Fetch the deal first (no RLS restriction needed — we'll verify MGA membership below)
  const { data: deal, error } = await supabase
    .from('deals')
    .select(`
      id, status, created_at, updated_at, mga_id,
      seller_id, buyer_id,
      seller_confirmed_next, buyer_confirmed_next,
      dd_complete_seller, dd_complete_buyer,
      cc_complete_seller, cc_complete_buyer,
      loi_seller_signed, loi_buyer_signed,
      loi_seller_signed_at, loi_buyer_signed_at,
      seller:seller_id(id, full_name, avatar_url),
      buyer:buyer_id(id, full_name, avatar_url)
    `)
    .eq('id', id)
    .single()

  if (error || !deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const d = deal as any

  // Verify user belongs to the deal's MGA
  const { data: mgaUser } = await supabase
    .from('mga_users')
    .select('id')
    .eq('user_id', user.id)
    .eq('mga_id', d.mga_id)
    .single()

  if (!mgaUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const sellerObj = Array.isArray(d.seller) ? d.seller[0] : d.seller
  const buyerObj  = Array.isArray(d.buyer)  ? d.buyer[0]  : d.buyer

  return NextResponse.json({ ...d, seller: sellerObj, buyer: buyerObj })
}
