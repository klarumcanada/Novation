import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
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

  const { data: advisor, error } = await admin
    .from('advisors')
    .select('id, full_name, province, years_in_practice, intent, aum, book_value, client_count, transition_duration, willing_to_stay, acquisition_budget, acquisition_timeline, target_provinces, target_cities, specialties, carrier_affiliations, bio, avatar_url')
    .eq('id', id)
    .single()

  if (error || !advisor) {
    return NextResponse.json({ error: 'Advisor not found' }, { status: 404 })
  }

  const { data: me } = await admin
    .from('advisors')
    .select('intent')
    .eq('id', user.id)
    .single()

  return NextResponse.json({ advisor, myIntent: me?.intent ?? null })
}