import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { onboardingSchema, profileEditSchema } from '@/lib/validations'

async function createClient() {
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

export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('advisors')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { isOnboarding, ...fields } = body

  const schema = isOnboarding ? onboardingSchema : profileEditSchema
  const result = schema.safeParse(fields)

  if (!result.success) {
    console.log('VALIDATION ERRORS:', JSON.stringify(result.error.flatten().fieldErrors, null, 2))
    return NextResponse.json(
      { error: 'Validation failed', issues: result.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const updateData: Record<string, unknown> = { ...result.data }

  let profileComplete = false

  if (!isOnboarding) {
    const d = result.data as Record<string, unknown>
    const intent = d.intent
    if (intent === 'selling') {
      profileComplete = !!(d.aum_value && d.client_count && d.transition_duration)
    } else if (intent === 'buying') {
      profileComplete = !!(d.acq_budget_value && d.acq_timeline)
    } else {
      profileComplete = true
    }
    updateData.profile_complete = profileComplete
  }

  const { data, error } = await supabase
    .from('advisors')
    .update(updateData)
    .eq('id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If profile is now complete, stamp mga_advisors status to registered
  if (profileComplete) {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Look up the invite code used by this advisor
    const { data: advisor } = await admin
      .from('advisors')
      .select('invite_code_used')
      .eq('id', user.id)
      .single()

    if (advisor?.invite_code_used) {
      // Find the mga_advisor_id from the invite code
      const { data: inviteRecord } = await admin
        .from('invite_codes')
        .select('mga_advisor_id')
        .eq('code', advisor.invite_code_used)
        .single()

      if (inviteRecord?.mga_advisor_id) {
        await admin
          .from('mga_advisors')
          .update({ status: 'registered' })
          .eq('id', inviteRecord.mga_advisor_id)
          .neq('status', 'active') // don't downgrade active advisors
      }
    }
  }

  return NextResponse.json(data)
}