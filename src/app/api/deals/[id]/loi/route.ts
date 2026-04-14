import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

function supabaseClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
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

// GET — fetch deal + LOI text (returns canned template if loi_text is null)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = supabaseClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: deal, error } = await supabase
    .from('deals')
    .select(`
      id, status,
      seller_id, buyer_id,
      loi_text, loi_edited_by,
      loi_seller_signed, loi_buyer_signed,
      loi_seller_signed_at, loi_buyer_signed_at,
      loi_seller_sig_data, loi_buyer_sig_data,
      seller:advisors!deals_seller_id_fkey(id, full_name, email),
      buyer:advisors!deals_buyer_id_fkey(id, full_name, email)
    `)
    .eq('id', id)
    .single()

  if (error || !deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isSeller = deal.seller_id === user.id
  const isBuyer = deal.buyer_id === user.id
  if (!isSeller && !isBuyer) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  return NextResponse.json({ deal })
}

// PUT — save edited LOI text (either party can edit until both have signed)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = supabaseClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { loi_text } = await req.json()

  const { data: deal } = await supabase
    .from('deals')
    .select('seller_id, buyer_id, loi_seller_signed, loi_buyer_signed')
    .eq('id', id)
    .single()

  if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isSeller = deal.seller_id === user.id
  const isBuyer = deal.buyer_id === user.id
  if (!isSeller && !isBuyer) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  // Can't edit once both have signed
  if (deal.loi_seller_signed && deal.loi_buyer_signed) {
    return NextResponse.json({ error: 'LOI is fully signed and cannot be edited' }, { status: 400 })
  }

  // If one party already signed, editing resets their signature
  const resetFields = deal.loi_seller_signed || deal.loi_buyer_signed
    ? {
        loi_seller_signed: false,
        loi_buyer_signed: false,
        loi_seller_signed_at: null,
        loi_buyer_signed_at: null,
        loi_seller_sig_data: null,
        loi_buyer_sig_data: null,
      }
    : {}

  const { data: updated, error } = await supabase
    .from('deals')
    .update({ loi_text, loi_edited_by: user.id, ...resetFields })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ deal: updated, signaturesReset: !!Object.keys(resetFields).length })
}