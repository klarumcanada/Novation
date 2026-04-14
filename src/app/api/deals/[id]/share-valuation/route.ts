import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

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
    .select('id, status, seller_id')
    .eq('id', id)
    .single()

  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  if (deal.seller_id !== user.id) return NextResponse.json({ error: 'Only the seller can share the valuation' }, { status: 403 })
  if (deal.status !== 'valuation_pending') return NextResponse.json({ error: 'Deal is not in valuation_pending stage' }, { status: 400 })

  const { data: updated, error } = await supabase
    .from('deals')
    .update({ status: 'valuation_shared', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ deal: updated })
}