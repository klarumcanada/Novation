import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
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

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: profile, error: profileError } = await admin
    .from('agora_profiles')
    .select('id, account_type, role, name, city, province, avatar_url, bio')
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

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: current } = await admin
    .from('agora_profiles')
    .select('account_type, role')
    .eq('id', user.id)
    .single()

  if (!current) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const body = await request.json()

  const profileUpdate: Record<string, unknown> = {}
  const pick = (key: string) => { if (body[key] !== undefined) profileUpdate[key] = body[key] }
  pick('name'); pick('city'); pick('province'); pick('bio'); pick('avatar_url'); pick('phone')

  const detailsTable = current.account_type === 'corporation' ? 'agora_corp_details' : 'agora_advisor_details'
  const detailsUpdate: Record<string, unknown> = {}
  if (body.products !== undefined) detailsUpdate.products = body.products
  if (body.carrier_affiliations !== undefined) detailsUpdate.carrier_affiliations = body.carrier_affiliations

  if (current.role === 'seller') {
    if (body.book_value !== undefined) {
      if (current.account_type === 'corporation') detailsUpdate.aggregate_aum_cad = body.book_value
      else detailsUpdate.aum_cad = body.book_value
    }
    if (body.client_count !== undefined) detailsUpdate.client_count = body.client_count
    if (body.exit_timeline !== undefined) detailsUpdate.exit_timeline = body.exit_timeline
    if (body.sale_portion_type !== undefined) detailsUpdate.sale_portion_type = body.sale_portion_type
    if (body.entity_name !== undefined && current.account_type === 'corporation') detailsUpdate.entity_name = body.entity_name
  } else {
    if (body.acquisition_budget_cad !== undefined) detailsUpdate.acquisition_budget_cad = body.acquisition_budget_cad
    if (body.acquisition_timeline !== undefined) detailsUpdate.acquisition_timeline = body.acquisition_timeline
    if (body.target_provinces !== undefined) detailsUpdate.target_provinces = body.target_provinces
  }

  const [profileRes, detailsRes] = await Promise.all([
    Object.keys(profileUpdate).length
      ? admin.from('agora_profiles').update(profileUpdate).eq('id', user.id)
      : Promise.resolve({ error: null }),
    Object.keys(detailsUpdate).length
      ? admin.from(detailsTable).update(detailsUpdate).eq('profile_id', user.id)
      : Promise.resolve({ error: null }),
  ])

  if (profileRes.error) return NextResponse.json({ error: profileRes.error.message }, { status: 400 })
  if (detailsRes.error) return NextResponse.json({ error: detailsRes.error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
