import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  code: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await req.json()
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ valid: false, error: 'Invalid request' }, { status: 400 })
  }

  const { code } = parsed.data

  const { data, error } = await supabase
    .from('invite_codes')
    .select('id, is_active, used_by, expires_at')
    .eq('code', code.toUpperCase().trim())
    .single()

  if (error || !data) {
    return NextResponse.json({ valid: false, error: 'Invalid invite code' }, { status: 200 })
  }

  if (!data.is_active) {
    return NextResponse.json({ valid: false, error: 'This invite code is no longer active' }, { status: 200 })
  }

  if (data.used_by) {
    return NextResponse.json({ valid: false, error: 'This invite code has already been used' }, { status: 200 })
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, error: 'This invite code has expired' }, { status: 200 })
  }

  return NextResponse.json({ valid: true, invite_id: data.id }, { status: 200 })
}