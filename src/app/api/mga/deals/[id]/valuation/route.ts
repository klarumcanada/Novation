import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
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

  // Verify MGA membership
  const { data: deal } = await supabase
    .from('deals')
    .select('seller_id, mga_id')
    .eq('id', id)
    .single()

  if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: mgaUser } = await supabase
    .from('mga_users')
    .select('id')
    .eq('user_id', user.id)
    .eq('mga_id', deal.mga_id)
    .single()

  if (!mgaUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  // Auth done — use admin client so RLS on book_valuations doesn't block the read
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: byDeal } = await admin
    .from('book_valuations')
    .select('*')
    .eq('deal_id', id)
    .maybeSingle()

  const valuation = byDeal ?? (await admin
    .from('book_valuations')
    .select('*')
    .eq('advisor_id', deal.seller_id)
    .maybeSingle()
  ).data

  if (!valuation) return NextResponse.json(null)
  return NextResponse.json(valuation)
}
