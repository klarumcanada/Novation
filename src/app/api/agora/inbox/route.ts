import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import MessageNotification from '@/app/agora/emails/MessageNotification'

const resend = new Resend(process.env.RESEND_API_KEY)

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
    .from('agora_messages')
    .select('id, subject, body, created_at, read_at, parent_id, from_id, to_id')
    .or(`from_id.eq.${user.id},to_id.eq.${user.id}`)
    .is('parent_id', null)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Resolve sender/recipient names from agora_profiles in one query
  const allIds = [...new Set((data ?? []).flatMap(m => [m.from_id, m.to_id]))]
  const { data: profiles } = await supabase
    .from('agora_profiles')
    .select('id, name')
    .in('id', allIds)

  const nameMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p.name]))

  const threads = await Promise.all((data ?? []).map(async (msg) => {
    const [{ count }, { data: latest }] = await Promise.all([
      supabase
        .from('agora_messages')
        .select('id', { count: 'exact', head: true })
        .eq('parent_id', msg.id),
      supabase
        .from('agora_messages')
        .select('created_at, read_at, from_id')
        .eq('parent_id', msg.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    const last_activity = latest?.created_at ?? msg.created_at
    const is_unread =
      (msg.to_id === user.id && !msg.read_at) ||
      !!(latest && latest.from_id !== user.id && !latest.read_at)

    return {
      ...msg,
      from: { id: msg.from_id, name: nameMap[msg.from_id] ?? 'Unknown' },
      to:   { id: msg.to_id,   name: nameMap[msg.to_id]   ?? 'Unknown' },
      reply_count: count ?? 0,
      last_activity,
      is_unread,
    }
  }))

  return NextResponse.json(threads)
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = makeSupabase(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { to_id, subject, body, parent_id } = await request.json()
  if (!to_id || !body?.trim()) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data: message, error } = await supabase
    .from('agora_messages')
    .insert({ from_id: user.id, to_id, subject: subject ?? null, body, parent_id: parent_id ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Fetch sender name and recipient email in parallel
  const [{ data: sender }, { data: recipientEmail }] = await Promise.all([
    supabase.from('agora_profiles').select('name').eq('id', user.id).single(),
    supabase.rpc('get_user_email', { user_id: to_id }),
  ])

  if (recipientEmail) {
    const threadId = parent_id ?? message.id
    try {
      await resend.emails.send({
        from: 'Agora <notifications@klarum.ca>',
        to: recipientEmail,
        subject: subject ? `New message: ${subject}` : `${sender?.name ?? 'Someone'} sent you a message on Agora`,
        react: MessageNotification({
          fromName: sender?.name ?? 'An Agora user',
          subject,
          body,
          inboxUrl: `${process.env.NEXT_PUBLIC_APP_URL}/agora/inbox/${threadId}`,
        }),
      })
    } catch (emailErr) {
      console.error('Agora email send failed:', emailErr)
    }
  }

  return NextResponse.json({ success: true, message })
}
