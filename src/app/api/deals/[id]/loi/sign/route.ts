import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest,
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

  // sig_data: base64 PNG string from canvas
  const { sig_data } = await req.json()
  if (!sig_data) return NextResponse.json({ error: 'Signature data required' }, { status: 400 })

  const { data: deal } = await supabase
    .from('deals')
    .select('id, status, seller_id, buyer_id, loi_seller_signed, loi_buyer_signed')
    .eq('id', id)
    .single()

  if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (deal.status !== 'loi') return NextResponse.json({ error: 'Deal is not in LOI stage' }, { status: 400 })

  const isSeller = deal.seller_id === user.id
  const isBuyer = deal.buyer_id === user.id
  if (!isSeller && !isBuyer) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const now = new Date().toISOString()

  const sigFields = isSeller
    ? { loi_seller_signed: true, loi_seller_signed_at: now, loi_seller_sig_data: sig_data }
    : { loi_buyer_signed: true, loi_buyer_signed_at: now, loi_buyer_sig_data: sig_data }

  const otherAlreadySigned = isSeller ? deal.loi_buyer_signed : deal.loi_seller_signed

  // If both now signed, advance to due_diligence
  const statusUpdate = otherAlreadySigned
    ? { status: 'due_diligence', seller_confirmed_next: false, buyer_confirmed_next: false }
    : {}

  const { data: updated, error } = await supabase
    .from('deals')
    .update({ ...sigFields, ...statusUpdate })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({
    deal: updated,
    bothSigned: otherAlreadySigned,
    advanced: otherAlreadySigned,
  })
}