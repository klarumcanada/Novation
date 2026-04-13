import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const MULTIPLES: Record<string, { low: number; high: number }> = {
  life:             { low: 2.5, high: 3.5 },
  disability:       { low: 2.0, high: 3.0 },
  critical_illness: { low: 2.0, high: 2.5 },
  health:           { low: 1.5, high: 2.0 },
  seg_funds:        { low: 1.5, high: 2.5 },
}

function makeSupabase(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
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
}

export async function GET() {
  const cookieStore = await cookies()
  const supabase = makeSupabase(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('book_valuations')
    .select('*')
    .eq('advisor_id', user.id)
    .maybeSingle()

  return NextResponse.json(data ?? null)
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = makeSupabase(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { deal_id } = await request.json()

  // If deal_id provided, verify advisor is the seller
  if (deal_id) {
    const { data: deal } = await supabase
      .from('deals')
      .select('id, seller_id')
      .eq('id', deal_id)
      .eq('seller_id', user.id)
      .single()
    if (!deal) return NextResponse.json({ error: 'Deal not found or not authorized' }, { status: 403 })

    await supabase
      .from('valuation_consents')
      .upsert({ advisor_id: user.id, deal_id })
  }

  const { data: policies } = await supabase
    .from('advisor_policies')
    .select('*')
    .eq('advisor_id', user.id)

  if (!policies || policies.length === 0)
    return NextResponse.json({ error: 'No policy data found' }, { status: 400 })

  const { data: advisor } = await supabase
    .from('advisors')
    .select('willing_to_stay')
    .eq('id', user.id)
    .single()

  const totalPolicies = policies.length
  const activePolicies = policies.filter(p => p.status === 'active').length
  const persistencyRate = activePolicies / totalPolicies
  const persistencyDiscount = persistencyRate < 0.85 ? 0.85 : persistencyRate
  const transitionFactor = advisor?.willing_to_stay ? 0.25 : 0

  const revenueByType: Record<string, number> = {}
  for (const policy of policies.filter(p => p.status === 'active')) {
    revenueByType[policy.product_type] = (revenueByType[policy.product_type] ?? 0) + Number(policy.annual_premium)
  }

  const breakdown: Record<string, {
    revenue: number
    multiple_low: number
    multiple_high: number
    value_low: number
    value_high: number
  }> = {}

  let totalLow = 0
  let totalHigh = 0

  for (const [productType, revenue] of Object.entries(revenueByType)) {
    const multiples = MULTIPLES[productType] ?? { low: 2.0, high: 3.0 }
    const adjustedRevenue = revenue * persistencyDiscount
    const valueLow = Math.round(adjustedRevenue * multiples.low)
    const valueHigh = Math.round(adjustedRevenue * (multiples.high + transitionFactor))
    breakdown[productType] = {
      revenue: Math.round(revenue),
      multiple_low: multiples.low,
      multiple_high: multiples.high + transitionFactor,
      value_low: valueLow,
      value_high: valueHigh,
    }
    totalLow += valueLow
    totalHigh += valueHigh
  }

  const payload = {
    advisor_id: user.id,
    deal_id: deal_id ?? null,
    status: 'complete',
    low_value: totalLow,
    high_value: totalHigh,
    breakdown,
    persistency_rate: Math.round(persistencyRate * 100) / 100,
    transition_factor: transitionFactor,
    total_policies: totalPolicies,
    active_policies: activePolicies,
    calculated_at: new Date().toISOString(),
    shared_with_buyer: false,
    updated_at: new Date().toISOString(),
  }

  const { data: valuation, error } = await supabase
    .from('book_valuations')
    .upsert(payload, { onConflict: 'advisor_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ valuation })
}

export async function PATCH(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = makeSupabase(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { valuation_id, shared_with_buyer } = await request.json()

  const { data, error } = await supabase
    .from('book_valuations')
    .update({ shared_with_buyer, updated_at: new Date().toISOString() })
    .eq('id', valuation_id)
    .eq('advisor_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ valuation: data })
}