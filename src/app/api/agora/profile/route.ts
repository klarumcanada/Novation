import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
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
