import { createServerClient, createAdminClient } from '@/lib/supabase'
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
      { error: 'Invalid form data' },
      { status: 400 }
    )
  }


const supabase = createAdminClient()
const { full_name, email, password, phone, province, years_in_practice } = parsed.data
const invite_code = body.invite_code

// Create auth user
const { data: authData, error: authError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: false,
  user_metadata: { full_name },
})

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message || 'Could not create account' },
      { status: 400 }
    )
  }

  // Insert advisor row using admin client to bypass RLS
  const { error: advisorError } = await supabase
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

  // Mark invite code as used
  await supabase
    .from('invite_codes')
    .update({
      is_active: false,
      used_by: authData.user.id,
      used_at: new Date().toISOString(),
    })
    .eq('code', invite_code)

  return NextResponse.json({ success: true }, { status: 200 })
}
