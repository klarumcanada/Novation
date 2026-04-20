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
    .select('mga_id')
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

  // Auth done — use admin client so RLS on deal_clients doesn't block the read
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: clients, error } = await admin
    .from('deal_clients')
    .select('id, client_name, client_email, carrier, policy_id, consent_status, consent_responded_at, email_sent_at')
    .eq('deal_id', id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ clients })
}
