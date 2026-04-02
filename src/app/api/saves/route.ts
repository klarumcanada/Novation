import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
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
}

// GET /api/saves — get all saved advisor IDs for current user
export async function GET() {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('saved_advisors')
    .select('advisor_id')
    .eq('saved_by', user.id)

  return NextResponse.json({ saved: data?.map(r => r.advisor_id) ?? [] })
}

// POST /api/saves — toggle save
export async function POST(request: NextRequest) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { advisor_id } = await request.json()

  // Check if already saved
  const { data: existing } = await supabase
    .from('saved_advisors')
    .select('id')
    .eq('saved_by', user.id)
    .eq('advisor_id', advisor_id)
    .single()

  if (existing) {
    await supabase.from('saved_advisors').delete()
      .eq('saved_by', user.id).eq('advisor_id', advisor_id)
    return NextResponse.json({ saved: false })
  } else {
    await supabase.from('saved_advisors').insert({ saved_by: user.id, advisor_id })
    return NextResponse.json({ saved: true })
  }
}