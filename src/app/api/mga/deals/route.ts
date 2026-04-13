import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => cs.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        ),
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: mgaUser } = await supabase
    .from('mga_users')
    .select('mgas(id, name)')
    .eq('user_id', user.id)
    .single()

  if (!mgaUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const mga = (Array.isArray(mgaUser.mgas) ? mgaUser.mgas[0] : mgaUser.mgas) as { id: string; name: string }

  const { data: advisors } = await supabase
    .from('advisors')
    .select('id, full_name')
    .eq('mga_id', mga.id)

  if (!advisors || advisors.length === 0) return NextResponse.json([])

  const advisorIds = advisors.map(a => a.id)
  const advisorMap = Object.fromEntries(advisors.map(a => [a.id, a.full_name]))

  const { data: deals } = await supabase
    .from('deals')
    .select('*')
    .or(`seller_id.in.(${advisorIds.join(',')}),buyer_id.in.(${advisorIds.join(',')})`)
    .order('updated_at', { ascending: false })

  // Check which deals have valuations
  const dealIds = (deals ?? []).map(d => d.id)
  const { data: valuations } = await supabase
    .from('book_valuations')
    .select('deal_id, low_value, high_value, shared_with_buyer')
    .in('deal_id', dealIds.length > 0 ? dealIds : ['none'])

  const valuationMap = Object.fromEntries(
    (valuations ?? []).map(v => [v.deal_id, v])
  )

  const enriched = (deals ?? []).map(d => ({
    ...d,
    seller_name: advisorMap[d.seller_id] ?? 'Unknown',
    buyer_name: advisorMap[d.buyer_id] ?? 'Unknown',
    valuation: valuationMap[d.id] ?? null,
  }))

  return NextResponse.json(enriched)
}