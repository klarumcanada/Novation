import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { intent, specialties, carrier_affiliations, bio } = body

  if (!intent || !specialties?.length || !carrier_affiliations?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

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

  const update: Record<string, unknown> = {
    intent,
    specialties,
    carrier_affiliations,
    bio,
    onboarding_complete: true,
    aum: body.aum ?? null,
    client_count: body.client_count ?? null,
    target_provinces: body.target_provinces ?? null,
    target_cities: body.target_cities ?? null,
    transition_duration: body.transition_duration ?? null,
    willing_to_stay: body.willing_to_stay ?? null,
    acquisition_budget: body.acquisition_budget ?? null,
    acquisition_timeline: body.acquisition_timeline ?? null,
  }
  if (body.avatar_url) update.avatar_url = body.avatar_url

  const { data, error } = await admin
    .from('advisors')
    .update(update)
    .eq('id', user.id)
    .select()

  console.log('UPDATE DATA:', data, 'UPDATE ERROR:', error)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}