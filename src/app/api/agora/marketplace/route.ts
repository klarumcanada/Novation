import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
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

  const { data: me } = await admin
    .from('agora_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!me) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const targetRole = me.role === 'buyer' ? 'seller' : 'buyer'

  const { searchParams } = new URL(request.url)
  const province = searchParams.get('province')
  const products = searchParams.get('products')?.split(',').filter(Boolean) ?? []
  const carriers = searchParams.get('carriers')?.split(',').filter(Boolean) ?? []
  const minBookValue = searchParams.get('minBookValue')
  const maxBookValue = searchParams.get('maxBookValue')
  const minBudget = searchParams.get('minBudget')
  const maxBudget = searchParams.get('maxBudget')
  const minYears = searchParams.get('minYears')
  const maxYears = searchParams.get('maxYears')
  const timeline = searchParams.get('timeline')
  const entityType = searchParams.get('entityType')

  let profileQuery = admin
    .from('agora_profiles')
    .select('id, account_type, role, name, city, province, avatar_url, bio')
    .eq('role', targetRole)

  if (province) profileQuery = profileQuery.eq('province', province)
  if (entityType) profileQuery = profileQuery.eq('account_type', entityType)

  const { data: profiles, error } = await profileQuery
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!profiles || profiles.length === 0) return NextResponse.json({ profiles: [], myRole: me.role })

  const individualIds = profiles.filter(p => p.account_type === 'individual').map(p => p.id)
  const corpIds = profiles.filter(p => p.account_type === 'corporation').map(p => p.id)

  const [advisorDetails, corpDetails] = await Promise.all([
    individualIds.length
      ? admin.from('agora_advisor_details').select('*').in('profile_id', individualIds)
      : Promise.resolve({ data: [] }),
    corpIds.length
      ? admin.from('agora_corp_details').select('*').in('profile_id', corpIds)
      : Promise.resolve({ data: [] }),
  ])

  const detailsMap = new Map<string, any>()
  ;(advisorDetails.data ?? []).forEach(d => detailsMap.set(d.profile_id, d))
  ;(corpDetails.data ?? []).forEach(d => detailsMap.set(d.profile_id, d))

  let merged = profiles
    .map(p => ({ ...p, details: detailsMap.get(p.id) ?? null }))
    .filter(p => p.details !== null)

  if (products.length) {
    merged = merged.filter(p =>
      products.some(pr => (p.details.products ?? []).includes(pr))
    )
  }
  if (carriers.length) {
    merged = merged.filter(p =>
      carriers.some(c => (p.details.carrier_affiliations ?? []).includes(c))
    )
  }
  if (targetRole === 'seller') {
    if (minBookValue) merged = merged.filter(p => (p.details.aum_cad ?? p.details.aggregate_aum_cad ?? 0) >= Number(minBookValue))
    if (maxBookValue) merged = merged.filter(p => (p.details.aum_cad ?? p.details.aggregate_aum_cad ?? 0) <= Number(maxBookValue))
    if (timeline) merged = merged.filter(p => p.details.exit_timeline === timeline)
  } else {
    if (minBudget) merged = merged.filter(p => (p.details.acquisition_budget_cad ?? 0) >= Number(minBudget) * 1_000_000)
    if (maxBudget) merged = merged.filter(p => (p.details.acquisition_budget_cad ?? 0) <= Number(maxBudget) * 1_000_000)
    if (timeline) merged = merged.filter(p => p.details.acquisition_timeline === timeline)
  }
  if (minYears) merged = merged.filter(p => (p.details.years_in_business ?? 0) >= Number(minYears))
  if (maxYears) merged = merged.filter(p => (p.details.years_in_business ?? 999) <= Number(maxYears))

  return NextResponse.json({ profiles: merged, myRole: me.role })
}
