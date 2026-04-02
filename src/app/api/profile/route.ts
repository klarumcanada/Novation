import { createServerClient } from '@supabase/ssr'
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

  if (!isOnboarding) {
    const d = result.data as Record<string, unknown>
    const intent = d.intent
    if (intent === 'selling') {
      updateData.profile_complete = !!(d.aum_value && d.client_count && d.transition_duration)
    } else if (intent === 'buying') {
      updateData.profile_complete = !!(d.acq_budget_value && d.acq_timeline)
    } else {
      updateData.profile_complete = true
    }
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

  return NextResponse.json(data)
}