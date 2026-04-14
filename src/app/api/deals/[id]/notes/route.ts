import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

function makeClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  )
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = makeClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: notes, error } = await supabase
    .from('deal_notes')
    .select('id, author_id, author_name, author_role, body, created_at')
    .eq('deal_id', id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ notes })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = makeClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { body } = await req.json()
  if (!body?.trim()) return NextResponse.json({ error: 'Note cannot be empty' }, { status: 400 })

  // Determine author role
  const { data: deal } = await supabase
    .from('deals')
    .select('seller_id, buyer_id, mga_id')
    .eq('id', id)
    .single()

  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  let author_role: 'seller' | 'buyer' | 'mga'
  if (deal.seller_id === user.id) author_role = 'seller'
  else if (deal.buyer_id === user.id) author_role = 'buyer'
  else {
    // Check if MGA user
    const { data: mgaUser } = await supabase
      .from('mga_users')
      .select('id')
      .eq('user_id', user.id)
      .eq('mga_id', deal.mga_id)
      .single()
    if (mgaUser) author_role = 'mga'
    else return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Get author name
  const { data: advisor } = await supabase
    .from('advisors')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const author_name = advisor?.full_name ?? user.email ?? 'Unknown'

  const { data: note, error } = await supabase
    .from('deal_notes')
    .insert({ deal_id: id, author_id: user.id, author_name, author_role, body: body.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ note })
}