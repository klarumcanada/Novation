import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
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

  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !authData.user) {
    return NextResponse.json({ error: error?.message ?? 'Login failed' }, { status: 401 })
  }

  // Check if this user is an MGA user
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: mgaUser } = await admin
    .from('mga_users')
    .select('mga_id, mgas(slug)')
    .eq('user_id', authData.user.id)
    .single()

  if (mgaUser?.mga_id) {
const mga = mgaUser.mgas as unknown as { slug: string }
    return NextResponse.json({ success: true, redirect: `/mga/${mga.slug}` }, { status: 200 })
  }

  return NextResponse.json({ success: true, redirect: '/dashboard' }, { status: 200 })
}