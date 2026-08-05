import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

async function makeClients() {
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
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  return { supabase, admin }
}

// Fields allowed at the agora_profiles level
const PROFILE_FIELDS = ['name', 'phone', 'city', 'province', 'bio', 'avatar_url'] as const

// Fields allowed per role/account_type combination in the details table
const DETAILS_FIELDS: Record<string, string[]> = {
  'seller:individual': [
    'aum_cad', 'client_count', 'exit_timeline', 'products', 'carrier_affiliations',
    'sale_portion_type', 'sale_portion_percentage',
    'sale_portion_segment_type', 'sale_portion_segment_detail',
    'valuation_method',
  ],
  'seller:corporation': [
    'aggregate_aum_cad', 'aggregate_client_count', 'exit_timeline', 'products', 'carrier_affiliations',
    'sale_portion_type', 'sale_portion_percentage',
    'sale_portion_segment_type', 'sale_portion_segment_detail',
    'entity_name',
  ],
  'buyer:individual': [
    'acquisition_budget_cad', 'acquisition_timeline', 'target_geography',
    'target_products', 'carrier_affiliations',
  ],
  'buyer:corporation': [
    'acquisition_budget_cad', 'acquisition_timeline', 'target_geography',
    'target_products', 'carrier_affiliations',
    'acquisition_target_count', 'target_size_range',
    'entity_name',
  ],
}

function computeProfileComplete(
  role: string,
  accountType: string,
  details: Record<string, unknown>
): boolean {
  if (role === 'seller' && accountType === 'individual') {
    return details.aum_cad != null && details.client_count != null && !!details.exit_timeline
  }
  if (role === 'seller' && accountType === 'corporation') {
    return details.aggregate_aum_cad != null && details.aggregate_client_count != null
  }
  if (role === 'buyer' && accountType === 'individual') {
    return details.acquisition_budget_cad != null && !!details.acquisition_timeline
  }
  // buyer:corporation
  return details.acquisition_target_count != null && !!details.target_size_range
}

export async function GET() {
  const { supabase, admin } = await makeClients()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile, error: profileError } = await admin
    .from('agora_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const detailsTable = profile.account_type === 'corporation'
    ? 'agora_corp_details'
    : 'agora_advisor_details'

  const { data: details, error: detailsError } = await admin
    .from(detailsTable)
    .select('*')
    .eq('profile_id', user.id)
    .single()

  if (detailsError || !details) return NextResponse.json({ error: 'Details not found' }, { status: 404 })

  let valuation: { low_value: number; high_value: number; calculated_at: string } | null = null
  if (profile.role === 'seller' && details.valuation_method === 'calculator') {
    const { data } = await admin
      .from('agora_valuations')
      .select('low_value, high_value, calculated_at')
      .eq('profile_id', user.id)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single()
    valuation = data ?? null
  }

  return NextResponse.json({ profile, details, valuation, myRole: profile.role })
}

export async function PATCH(request: NextRequest) {
  const { supabase, admin } = await makeClients()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: current } = await admin
    .from('agora_profiles')
    .select('account_type, role')
    .eq('id', user.id)
    .single()

  if (!current) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { role, account_type } = current
  const detailsTable = account_type === 'corporation' ? 'agora_corp_details' : 'agora_advisor_details'
  const allowedDetailsFields = DETAILS_FIELDS[`${role}:${account_type}`] ?? []

  const body = await request.json()

  // Build profile-level update
  const profileUpdate: Record<string, unknown> = {}
  for (const key of PROFILE_FIELDS) {
    if (key in body) profileUpdate[key] = body[key]
  }

  // Build details-level update (only permitted fields for this role/account_type)
  const detailsUpdate: Record<string, unknown> = {}
  for (const key of allowedDetailsFields) {
    if (key in body) detailsUpdate[key] = body[key]
  }

  // Fetch current details to merge for completeness computation
  const { data: currentDetails } = await admin
    .from(detailsTable)
    .select('*')
    .eq('profile_id', user.id)
    .single()

  const mergedDetails = { ...(currentDetails ?? {}), ...detailsUpdate } as Record<string, unknown>
  const profile_complete = computeProfileComplete(role, account_type, mergedDetails)

  // Run profile + details updates in parallel; always write profile_complete
  const [profileRes, detailsRes] = await Promise.all([
    admin
      .from('agora_profiles')
      .update({ ...profileUpdate, profile_complete })
      .eq('id', user.id),
    Object.keys(detailsUpdate).length
      ? admin.from(detailsTable).update(detailsUpdate).eq('profile_id', user.id)
      : Promise.resolve({ error: null }),
  ])

  if (profileRes.error) return NextResponse.json({ error: profileRes.error.message }, { status: 400 })
  if (detailsRes.error) return NextResponse.json({ error: (detailsRes as any).error.message }, { status: 400 })

  return NextResponse.json({ success: true, profile_complete })
}
