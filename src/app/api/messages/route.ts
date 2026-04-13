import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import MessageNotification from '@/emails/MessageNotification'

const resend = new Resend(process.env.RESEND_API_KEY)

function makeSupabase(cookieStore: Awaited<ReturnType<typeof cookies>>) {
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
  const cookieStore = await cookies()
  const supabase = makeSupabase(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch top-level messages involving the user
  const { data, error } = await supabase
    .from('messages')
    .select('id, subject, body, created_at, read_at, parent_id, from_id, to_id')
    .or(`from_id.eq.${user.id},to_id.eq.${user.id}`)
    .is('parent_id', null)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Collect all unique advisor IDs involved
  const allIds = [...new Set((data ?? []).flatMap(m => [m.from_id, m.to_id]))]

  // Fetch all advisor names in one query
  const { data: advisors } = await supabase
    .from('advisors')
    .select('id, full_name')
    .in('id', allIds)

  const advisorMap = Object.fromEntries((advisors ?? []).map(a => [a.id, a.full_name]))

  const threadsWithMeta = await Promise.all((data ?? []).map(async (msg) => {
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', msg.id)

    const { data: latest } = await supabase
      .from('messages')
      .select('created_at, read_at, from_id')
      .eq('parent_id', msg.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const lastActivity = latest?.created_at ?? msg.created_at
    const isUnread =
      (msg.to_id === user.id && !msg.read_at) ||
      !!(latest && latest.from_id !== user.id && !latest.read_at)

    return {
      ...msg,
      from: { id: msg.from_id, full_name: advisorMap[msg.from_id] ?? 'Unknown' },
      to: { id: msg.to_id, full_name: advisorMap[msg.to_id] ?? 'Unknown' },
      reply_count: count ?? 0,
      last_activity: lastActivity,
      is_unread: isUnread,
    }
  }))

  return NextResponse.json(threadsWithMeta)
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = makeSupabase(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { to_id, subject, body, parent_id } = await request.json()
  if (!to_id || !body?.trim()) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data: message, error } = await supabase
    .from('messages')
    .insert({ from_id: user.id, to_id, subject, body, parent_id: parent_id ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const { data: sender } = await supabase
    .from('advisors')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const { data: recipientAuth } = await supabase.rpc('get_user_email', { user_id: to_id })

  if (recipientAuth) {
    try {
      await resend.emails.send({
        from: 'Novation <notifications@klarum.ca>',
        to: recipientAuth,
        subject: subject ? `New message: ${subject}` : `${sender?.full_name ?? 'Someone'} sent you a message`,
        react: MessageNotification({
          fromName: sender?.full_name ?? 'A Novation user',
          subject,
          body,
          inboxUrl: `${process.env.NEXT_PUBLIC_APP_URL}/inbox/${parent_id ?? message.id}`,
        }),
      })
    } catch (emailErr) {
      console.error('Email send failed:', emailErr)
    }
  }

  return NextResponse.json({ success: true, message })
}