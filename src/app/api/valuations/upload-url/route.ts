import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

function makeSupabase(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => cs.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        ),
      },
    }
  )
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = makeSupabase(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { deal_id, filename } = await request.json()
  if (!deal_id || !filename) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const ext = filename.split('.').pop() ?? 'pdf'
  const storagePath = `${user.id}/${deal_id}/${Date.now()}.${ext}`

  const { data, error } = await supabase.storage
    .from('valuation-documents')
    .createSignedUploadUrl(storagePath)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Store the storage path — served as a signed URL on read via the MGA portal
  return NextResponse.json({ upload_url: data.signedUrl, document_url: storagePath })
}