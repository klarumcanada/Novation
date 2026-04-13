import { createServerClient } from '@supabase/ssr'
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
        setAll: (cs) => cs.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        ),
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify MGA user
  const { data: mgaUser } = await supabase
    .from('mga_users')
    .select('mgas(id, name)')
    .eq('user_id', user.id)
    .single()

  if (!mgaUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const mga = (Array.isArray(mgaUser.mgas) ? mgaUser.mgas[0] : mgaUser.mgas) as { id: string; name: string }

  // Get all advisors in this MGA
  const { data: advisors } = await supabase
    .from('advisors')
    .select('id, full_name, province, years_in_practice')
    .eq('mga_id', mga.id)

  if (!advisors || advisors.length === 0) return NextResponse.json([])

  const advisorIds = advisors.map(a => a.id)
  const advisorMap = Object.fromEntries(advisors.map(a => [a.id, a]))

  // Get all valuations for these advisors
  const { data: valuations } = await supabase
    .from('book_valuations')
    .select('*')
    .in('advisor_id', advisorIds)
    .eq('status', 'complete')
    .order('calculated_at', { ascending: false })

  const enriched = (valuations ?? []).map(v => ({
    ...v,
    advisor: advisorMap[v.advisor_id] ?? null,
    mga_name: mga.name,
  }))

  return NextResponse.json(enriched)
}