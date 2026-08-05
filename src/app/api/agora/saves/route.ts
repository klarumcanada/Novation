import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

function makeSupabase(cookieStore: Awaited<ReturnType<typeof cookies>>) {
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

export async function GET() {
  const cookieStore = await cookies()
  const supabase = makeSupabase(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('agora_saves')
    .select('saved_profile_id')
    .eq('profile_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ saved: (data ?? []).map(d => d.saved_profile_id) })
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = makeSupabase(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { saved_profile_id } = await request.json()
  if (!saved_profile_id) return NextResponse.json({ error: 'Missing saved_profile_id' }, { status: 400 })

  const { error } = await supabase
    .from('agora_saves')
    .upsert({ profile_id: user.id, saved_profile_id }, { onConflict: 'profile_id,saved_profile_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = makeSupabase(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const saved_profile_id = searchParams.get('saved_profile_id')
  if (!saved_profile_id) return NextResponse.json({ error: 'Missing saved_profile_id' }, { status: 400 })

  const { error } = await supabase
    .from('agora_saves')
    .delete()
    .eq('profile_id', user.id)
    .eq('saved_profile_id', saved_profile_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
