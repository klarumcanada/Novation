import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const BUCKET = 'deal-documents'

function makeClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
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

function makeAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function verifyParticipant(supabase: ReturnType<typeof makeClient>, dealId: string, userId: string) {
  const { data: deal } = await supabase
    .from('deals')
    .select('seller_id, buyer_id')
    .eq('id', dealId)
    .single()
  if (!deal) return null
  if (deal.seller_id !== userId && deal.buyer_id !== userId) return null
  return deal
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = makeClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const deal = await verifyParticipant(supabase, id, user.id)
  if (!deal) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { data: docs, error } = await supabase
    .from('deal_documents')
    .select('id, filename, storage_path, uploader_id, created_at, uploader:uploader_id(full_name)')
    .eq('deal_id', id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const admin = makeAdmin()

  const documents = await Promise.all((docs ?? []).map(async (doc: any) => {
    const uploaderObj = Array.isArray(doc.uploader) ? doc.uploader[0] : doc.uploader
    const { data: signed } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, 3600)
    return {
      id:            doc.id,
      filename:      doc.filename,
      storage_path:  doc.storage_path,
      uploader_name: uploaderObj?.full_name ?? 'Unknown',
      created_at:    doc.created_at,
      signed_url:    signed?.signedUrl ?? null,
    }
  }))

  return NextResponse.json({ documents })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = makeClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const deal = await verifyParticipant(supabase, id, user.id)
  if (!deal) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ALLOWED_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
  ]
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Only PDF, DOCX, and PNG files are allowed.' }, { status: 400 })
  }

  const filename    = file.name
  const storagePath = `${id}/${Date.now()}-${filename}`

  const admin = makeAdmin()

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, await file.arrayBuffer(), { contentType: file.type })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 })

  const { data: doc, error: insertError } = await supabase
    .from('deal_documents')
    .insert({ deal_id: id, filename, storage_path: storagePath, uploader_id: user.id })
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 })

  const { data: advisor } = await supabase
    .from('advisors')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const { data: signed } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600)

  return NextResponse.json({
    document: {
      ...doc,
      uploader_name: advisor?.full_name ?? 'Unknown',
      signed_url:    signed?.signedUrl ?? null,
    }
  }, { status: 201 })
}
