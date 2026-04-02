import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { registrationSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  const body = await request.json()

  const parsed = registrationSchema.safeParse({
    ...body,
    years_in_practice: Number(body.years_in_practice),
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid form data', issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { full_name, email, password, phone, province, years_in_practice } = parsed.data
  const invite_code = body.invite_code

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

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message ?? 'Could not create account' },
      { status: 400 }
    )
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error: advisorError } = await admin
    .from('advisors')
    .insert({
      id: authData.user.id,
      full_name,
      email,
      phone,
      province,
      years_in_practice,
      invite_code_used: invite_code,
    })

  if (advisorError) {
    return NextResponse.json(
      { error: advisorError.message },
      { status: 400 }
    )
  }

  await admin
    .from('invite_codes')
    .update({
      is_active: false,
      used_by: authData.user.id,
      used_at: new Date().toISOString(),
    })
    .eq('code', invite_code)

  return NextResponse.json({ success: true }, { status: 200 })
}