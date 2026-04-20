import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

function makeAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

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

  const { data: valuation } = await supabase
    .from('book_valuations')
    .select('*')
    .eq('advisor_id', user.id)
    .maybeSingle()

  if (!valuation) return NextResponse.json(null)

  const { data: advisor } = await supabase
    .from('advisors')
    .select('full_name, province, years_in_practice, mga_id')
    .eq('id', user.id)
    .single()

  let mga_name = null
  if (advisor?.mga_id) {
    const { data: mga } = await supabase
      .from('mgas')
      .select('name')
      .eq('id', advisor.mga_id)
      .single()
    mga_name = mga?.name ?? null
  }

  return NextResponse.json({
    ...valuation,
    advisor_name: advisor?.full_name ?? null,
    advisor_province: advisor?.province ?? null,
    advisor_years: advisor?.years_in_practice ?? null,
    mga_name,
  })
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = makeSupabase(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { deal_id, source = 'novation' } = body

  // ── Manual entry ───────────────────────────────────────────────
  if (source === 'manual') {
    const payload = {
      advisor_id: user.id,
      deal_id: deal_id ?? null,
      source: 'manual',
      status: 'complete',
      low_value: body.low_value,
      high_value: body.high_value,
      valuation_method: body.valuation_method ?? null,
      prepared_by: body.prepared_by ?? null,
      notes: body.notes ?? null,
      effective_date: body.effective_date ?? null,
      document_url: null,
      shared_with_buyer: false,
      mga_doc_consent: false,
      calculated_at: new Date().toISOString(),
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

  // ── Uploaded report ────────────────────────────────────────────
  if (source === 'uploaded') {
    const payload = {
      advisor_id: user.id,
      deal_id: deal_id ?? null,
      source: 'uploaded',
      status: 'complete',
      low_value: body.low_value ?? null,
      high_value: body.high_value ?? null,
      valuation_method: null,
      prepared_by: body.prepared_by ?? null,
      notes: null,
      effective_date: body.effective_date ?? null,
      document_url: body.document_url ?? null,
      shared_with_buyer: false,
      mga_doc_consent: false,
      calculated_at: new Date().toISOString(),
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

  // ── Novation calculation ───────────────────────────────────────
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

  const admin = makeAdmin()

  // Seed demo policies if none exist yet
  let { data: policies } = await admin
    .from('advisor_policies')
    .select('*')
    .eq('advisor_id', user.id)

  if (!policies || policies.length === 0) {
    const SEED = [
      { product_type: 'life',             annual_premium: 42_000, status: 'active',  carrier: 'Canada Life'   },
      { product_type: 'life',             annual_premium: 31_500, status: 'active',  carrier: 'Sun Life'      },
      { product_type: 'life',             annual_premium: 18_200, status: 'active',  carrier: 'Manulife'      },
      { product_type: 'life',             annual_premium:  9_800, status: 'lapsed',  carrier: 'iA Financial'  },
      { product_type: 'disability',       annual_premium: 27_600, status: 'active',  carrier: 'Sun Life'      },
      { product_type: 'disability',       annual_premium: 14_400, status: 'active',  carrier: 'Manulife'      },
      { product_type: 'disability',       annual_premium:  8_100, status: 'lapsed',  carrier: 'Canada Life'   },
      { product_type: 'critical_illness', annual_premium: 19_500, status: 'active',  carrier: 'iA Financial'  },
      { product_type: 'critical_illness', annual_premium: 11_200, status: 'active',  carrier: 'Manulife'      },
      { product_type: 'health',           annual_premium: 24_800, status: 'active',  carrier: 'Canada Life'   },
      { product_type: 'health',           annual_premium: 16_300, status: 'active',  carrier: 'Sun Life'      },
      { product_type: 'seg_funds',        annual_premium: 38_000, status: 'active',  carrier: 'Canada Life'   },
      { product_type: 'seg_funds',        annual_premium: 22_500, status: 'active',  carrier: 'Manulife'      },
      { product_type: 'seg_funds',        annual_premium:  7_200, status: 'lapsed',  carrier: 'RBC Insurance' },
    ]
    const { data: inserted } = await admin
      .from('advisor_policies')
      .insert(SEED.map(p => ({ advisor_id: user.id, ...p })))
      .select('*')
    policies = inserted ?? []
  }

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
    source: 'novation',
    status: 'complete',
    low_value: totalLow,
    high_value: totalHigh,
    breakdown,
    persistency_rate: Math.round(persistencyRate * 100) / 100,
    transition_factor: transitionFactor,
    total_policies: totalPolicies,
    active_policies: activePolicies,
    valuation_method: null,
    prepared_by: null,
    notes: null,
    effective_date: null,
    document_url: null,
    shared_with_buyer: false,
    mga_doc_consent: false,
    calculated_at: new Date().toISOString(),
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

  const { valuation_id, shared_with_buyer, mga_doc_consent } = await request.json()

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (shared_with_buyer !== undefined) updateData.shared_with_buyer = shared_with_buyer
  if (mga_doc_consent   !== undefined) updateData.mga_doc_consent   = mga_doc_consent

  const { data, error } = await supabase
    .from('book_valuations')
    .update(updateData)
    .eq('id', valuation_id)
    .eq('advisor_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ valuation: data })
}