import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
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
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: me } = await admin
    .from('advisors')
    .select('intent')
    .eq('id', user.id)
    .single()

  if (!me) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const targetIntent = me.intent === 'selling' ? 'buying' : 'selling'

  const { searchParams } = new URL(request.url)
  const province = searchParams.get('province')
  const specialties = searchParams.get('specialties')?.split(',').filter(Boolean)
  const carriers = searchParams.get('carriers')?.split(',').filter(Boolean)
  const minAum = searchParams.get('minAum')
  const maxAum = searchParams.get('maxAum')
  const minBudget = searchParams.get('minBudget')
  const maxBudget = searchParams.get('maxBudget')
  const minYears = searchParams.get('minYears')
  const maxYears = searchParams.get('maxYears')
  const timeline = searchParams.get('timeline')

  let query = admin
    .from('advisors')
  .select('id, full_name, province, years_in_practice, intent, aum, book_value, client_count, transition_duration, willing_to_stay, acquisition_budget, acquisition_timeline, target_provinces, target_cities, specialties, carrier_affiliations, bio, avatar_url')
    .eq('intent', targetIntent)
    .neq('id', user.id)

  if (province) query = query.eq('province', province)
  if (minAum) query = query.gte('aum', Number(minAum))
  if (maxAum) query = query.lte('aum', Number(maxAum))
  if (minBudget) query = query.gte('acquisition_budget', Number(minBudget))
  if (maxBudget) query = query.lte('acquisition_budget', Number(maxBudget))
  if (minYears) query = query.gte('years_in_practice', Number(minYears))
  if (maxYears) query = query.lte('years_in_practice', Number(maxYears))
  if (timeline) query = query.eq('transition_duration', timeline)

  const { data: advisors, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  let filtered = advisors ?? []
  if (specialties?.length) {
    filtered = filtered.filter(a =>
      specialties.some(s => a.specialties?.includes(s))
    )
  }
  if (carriers?.length) {
    filtered = filtered.filter(a =>
      carriers.some(c => a.carrier_affiliations?.includes(c))
    )
  }

  return NextResponse.json({ advisors: filtered, myIntent: me.intent })
}