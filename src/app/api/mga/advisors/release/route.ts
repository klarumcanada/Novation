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

  const { mga_advisor_id } = await req.json()
  if (!mga_advisor_id) {
    return NextResponse.json({ error: 'Missing mga_advisor_id' }, { status: 400 })
  }

  // Load the advisor from holding area
  const { data: advisor, error: advisorError } = await admin
    .from('mga_advisors')
    .select('*, mgas(id, name, slug)')
    .eq('id', mga_advisor_id)
    .single()

  if (advisorError || !advisor) {
    return NextResponse.json({ error: 'Advisor not found' }, { status: 404 })
  }

  // Verify the calling user belongs to this MGA with admin/owner role
  const { data: mgaUser } = await admin
    .from('mga_users')
    .select('role')
    .eq('user_id', user.id)
    .eq('mga_id', advisor.mga_id)
    .single()

  if (!mgaUser || !['owner', 'admin'].includes(mgaUser.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const mga = advisor.mgas as { id: string; name: string; slug: string }

  // Generate a unique invite code
  const code = `${mga.slug.toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

  // Insert invite code
  const { data: inviteCode, error: codeError } = await admin
    .from('invite_codes')
    .insert({
      code,
      mga_id: advisor.mga_id,
      mga_advisor_id: advisor.id,
      created_by: user.id,
      is_active: true,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    })
    .select()
    .single()

  if (codeError || !inviteCode) {
    return NextResponse.json({ error: 'Failed to generate invite code' }, { status: 500 })
  }

  // Stamp invite code onto mga_advisors and update status
  const { error: updateError } = await admin
    .from('mga_advisors')
    .update({
      status: 'invited',
      invite_code_id: inviteCode.id,
      invited_at: new Date().toISOString(),
    })
    .eq('id', advisor.id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update advisor status' }, { status: 500 })
  }

  // Send invite email
  const registerUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/register?code=${code}`

  const { error: emailError } = await resend.emails.send({
    from: 'Novation <hello@klarum.ca>',
    to: advisor.email,
    subject: `You've been invited to Novation by ${mga.name}`,
    html: `
      <div style="font-family: 'DM Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
        <div style="margin-bottom: 28px;">
          <span style="font-family: Georgia, serif; font-size: 13px; font-weight: 600; color: #64748B;">klarum</span>
          <span style="display: block; font-size: 11px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: #3B82F6; margin-top: 2px;">Novation</span>
        </div>

        <h1 style="font-family: Georgia, serif; font-size: 26px; font-weight: 400; color: #0D1B3E; margin: 0 0 16px; letter-spacing: -0.02em; line-height: 1.2;">
          You've been invited to Novation
        </h1>

        <p style="font-size: 15px; color: #4B5563; line-height: 1.7; margin: 0 0 8px;">
          Hi ${advisor.full_name},
        </p>

        <p style="font-size: 15px; color: #4B5563; line-height: 1.7; margin: 0 0 28px;">
          ${mga.name} has invited you to join Novation — a private marketplace for financial advisors to explore succession opportunities.
        </p>

        <a href="${registerUrl}"
           style="display: inline-block; background: #0D1B3E; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500; margin-bottom: 24px;">
          Create your account →
        </a>

        <p style="font-size: 13px; color: #9CA3AF; line-height: 1.6; margin: 0 0 8px;">
          Or copy this invite code into the registration page:
        </p>

        <div style="background: #F8F7F4; border: 1px solid rgba(11,31,58,0.08); border-radius: 8px; padding: 14px 18px; font-family: monospace; font-size: 16px; color: #0D1B3E; letter-spacing: 0.08em; margin-bottom: 28px;">
          ${code}
        </div>

        <p style="font-size: 12px; color: #9CA3AF; line-height: 1.6;">
          This invite expires in 30 days. If you weren't expecting this, you can ignore it.
        </p>
      </div>
    `,
  })

  if (emailError) {
    // Don't fail the whole request — invite code is created, email just didn't send
    console.error('Email send failed:', emailError)
    return NextResponse.json({
      success: true,
      warning: 'Advisor marked as invited but email failed to send. Check Resend configuration.',
    })
  }

  return NextResponse.json({ success: true })
}