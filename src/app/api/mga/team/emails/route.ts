import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const admin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { mga_id, email, role } = await req.json()
  if (!mga_id || !email || !role) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Verify caller is admin/owner of this MGA
  const { data: mgaUser } = await admin
    .from('mga_users')
    .select('role')
    .eq('user_id', user.id)
    .eq('mga_id', mga_id)
    .single()

  if (!mgaUser || !['owner', 'admin'].includes(mgaUser.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  // Get MGA name
  const { data: mga } = await admin
    .from('mgas')
    .select('name, slug')
    .eq('id', mga_id)
    .single()

  if (!mga) return NextResponse.json({ error: 'MGA not found' }, { status: 404 })

  // Check if user already exists in auth
  const { data: existingUsers } = await admin.auth.admin.listUsers()
  const existingUser = existingUsers?.users.find((u) => u.email === email)

  if (existingUser) {
    // User already has an account — just add to mga_users if not already there
    const { error: insertError } = await admin
      .from('mga_users')
      .insert({ user_id: existingUser.id, mga_id, role })

    if (insertError) {
      return NextResponse.json(
        { error: insertError.code === '23505' ? 'This user is already on your team.' : insertError.message },
        { status: 400 }
      )
    }
  } else {
    // New user — create account and send invite via Supabase
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: { invited_to_mga: mga_id, role },
    })

    if (createError || !newUser.user) {
      return NextResponse.json({ error: createError?.message ?? 'Failed to create user' }, { status: 500 })
    }

    // Add to mga_users
    await admin
      .from('mga_users')
      .insert({ user_id: newUser.user.id, mga_id, role })

    // Generate magic link
    const { data: linkData } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/mga/${mga.slug}`,
      },
    })

    if (linkData?.properties?.action_link) {
      await resend.emails.send({
        from: 'Novation <hello@klarum.ca>',
        to: email,
        subject: `You've been added to ${mga.name} on Novation`,
        html: `
          <div style="font-family: 'DM Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
            <div style="margin-bottom: 28px;">
              <span style="font-family: Georgia, serif; font-size: 13px; font-weight: 600; color: #64748B;">klarum</span>
              <span style="display: block; font-size: 11px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: #3B82F6; margin-top: 2px;">Novation</span>
            </div>

            <h1 style="font-family: Georgia, serif; font-size: 26px; font-weight: 400; color: #0D1B3E; margin: 0 0 16px; letter-spacing: -0.02em; line-height: 1.2;">
              You've been added to ${mga.name}
            </h1>

            <p style="font-size: 15px; color: #4B5563; line-height: 1.7; margin: 0 0 28px;">
              You've been granted <strong>${role}</strong> access to ${mga.name}'s Novation portal. Click below to set up your account.
            </p>

            <a href="${linkData.properties.action_link}"
               style="display: inline-block; background: #0D1B3E; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500; margin-bottom: 24px;">
              Access your portal →
            </a>

            <p style="font-size: 12px; color: #9CA3AF; line-height: 1.6;">
              If you weren't expecting this, you can ignore it.
            </p>
          </div>
        `,
      })
    }
  }

  return NextResponse.json({ success: true })
}