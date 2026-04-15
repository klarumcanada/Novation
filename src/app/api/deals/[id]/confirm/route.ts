import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Stages where mutual confirmation advances the deal
const MUTUAL_STAGES = [
  'interested',       // non-initiator confirms → valuation_pending
  'loi',              // both confirm → due_diligence
  'due_diligence',    // open-ended, rules TBD — mutual for now
  'client_communication',
  'book_transfer',
]

// valuation_pending → valuation_shared is driven by the valuation PATCH, not this route
// valuation_shared → loi is buyer-only confirmation, handled below

function nextStage(current: string): string | null {
  const map: Record<string, string> = {
    interested:             'valuation_pending',
    loi:                    'due_diligence',
    due_diligence:          'client_communication',
    client_communication:   'book_transfer',
    book_transfer:          'closed',
  }
  return map[current] ?? null
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: deal } = await supabase
    .from('deals')
    .select('id, status, seller_id, buyer_id, initiator_id, seller_confirmed_next, buyer_confirmed_next, thread_id')
    .eq('id', id)
    .single()

  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  const isSeller = deal.seller_id === user.id
  const isBuyer  = deal.buyer_id  === user.id
  if (!isSeller && !isBuyer) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  // ── interested → valuation_pending ──────────────────────────────
  // Only the non-initiator can confirm here
  if (deal.status === 'interested') {
    if (deal.initiator_id === user.id) {
      return NextResponse.json({ error: 'Waiting for the other party to confirm interest' }, { status: 400 })
    }

    const { data: updated, error } = await supabase
      .from('deals')
      .update({
        status: 'valuation_pending',
        seller_confirmed_next: false,
        buyer_confirmed_next: false,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Copy thread messages into deal notes
    if (deal.thread_id) {
      const { data: messages } = await supabase
        .from('messages')
        .select('id, from_id, body, created_at')
        .or(`id.eq.${deal.thread_id},parent_id.eq.${deal.thread_id}`)
        .order('created_at', { ascending: true })

      if (messages && messages.length > 0) {
        const authorIds = [...new Set(messages.map((m: any) => m.from_id))]
        const { data: advisors } = await supabase
          .from('advisors')
          .select('id, full_name')
          .in('id', authorIds)
        const nameMap = Object.fromEntries((advisors ?? []).map((a: any) => [a.id, a.full_name]))

        const notes = messages.map((m: any) => ({
          deal_id: id,
          author_id: m.from_id,
          author_name: nameMap[m.from_id] ?? 'Unknown',
          author_role: m.from_id === deal.seller_id ? 'seller' : 'buyer',
          body: m.body,
          created_at: m.created_at,
        }))

        await supabase.from('deal_notes').insert(notes)
      }
    }

    return NextResponse.json({ deal: updated, advanced: true, new_status: 'valuation_pending' })
  }

  // ── valuation_shared → loi ───────────────────────────────────────
  // Buyer only — seller already committed by sharing the valuation
  if (deal.status === 'valuation_shared') {
    if (!isBuyer) {
      return NextResponse.json({ error: 'Waiting for the buyer to confirm they want to proceed to LOI' }, { status: 400 })
    }

    const { data: updated, error } = await supabase
      .from('deals')
      .update({
        status: 'loi',
        seller_confirmed_next: false,
        buyer_confirmed_next: false,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ deal: updated, advanced: true, new_status: 'loi' })
  }

  // ── valuation_pending ────────────────────────────────────────────
  // No confirmation action here — seller must complete + share valuation via /api/valuations
  if (deal.status === 'valuation_pending') {
    return NextResponse.json({ error: 'Complete and share your valuation to advance this deal' }, { status: 400 })
  }

  // ── Mutual confirmation stages (loi, due_diligence, client_communication, book_transfer) ──
  if (MUTUAL_STAGES.includes(deal.status)) {
    const updateField   = isSeller ? 'seller_confirmed_next' : 'buyer_confirmed_next'
    const otherConfirmed = isSeller ? deal.buyer_confirmed_next : deal.seller_confirmed_next

    if (otherConfirmed) {
      const next = nextStage(deal.status)
      if (!next) return NextResponse.json({ error: 'Already at final stage' }, { status: 400 })

      const { data: updated, error } = await supabase
        .from('deals')
        .update({
          status: next,
          seller_confirmed_next: false,
          buyer_confirmed_next: false,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ deal: updated, advanced: true, new_status: next })
    }

    const { data: updated, error } = await supabase
      .from('deals')
      .update({ [updateField]: true })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ deal: updated, advanced: false })
  }

  return NextResponse.json({ error: 'No action available for current stage' }, { status: 400 })
}