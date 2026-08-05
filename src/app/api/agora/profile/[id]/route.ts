import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
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

  const [{ data: me }, { data: target, error: targetError }] = await Promise.all([
    admin.from('agora_profiles').select('role').eq('id', user.id).single(),
    admin.from('agora_profiles').select('id, account_type, role, name, city, province, avatar_url, bio').eq('id', id).single(),
  ])

  if (!me) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  if (targetError || !target) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Enforce opposite-role visibility unless viewing own profile
  const isSelf = user.id === id
  const isOppositeRole = target.role !== me.role
  if (!isSelf && !isOppositeRole) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const detailsTable = target.account_type === 'corporation'
    ? 'agora_corp_details'
    : 'agora_advisor_details'

  const { data: details, error: detailsError } = await admin
    .from(detailsTable)
    .select('*')
    .eq('profile_id', id)
    .single()

  if (detailsError || !details) return NextResponse.json({ error: 'Details not found' }, { status: 404 })

  let valuation: { low_value: number; high_value: number; calculated_at: string } | null = null
  if (target.role === 'seller' && details.valuation_method === 'calculator') {
    const { data } = await admin
      .from('agora_valuations')
      .select('low_value, high_value, calculated_at')
      .eq('profile_id', id)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single()
    valuation = data ?? null
  }

  return NextResponse.json({ profile: target, details, valuation, myRole: me.role })
}
