import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function makeAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function page(title: string, content: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      background: #f9f9f7;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 24px;
      color: #1a1a1a;
      line-height: 1.6;
    }
    .card {
      background: white;
      border: 1px solid #e5e5e5;
      border-radius: 12px;
      padding: 40px 36px;
      max-width: 520px;
      width: 100%;
    }
    h1 { font-size: 20px; font-weight: 600; margin-bottom: 12px; }
    p  { font-size: 15px; color: #444; margin-bottom: 28px; }
    .actions { display: flex; gap: 12px; flex-wrap: wrap; }
    button {
      padding: 12px 28px; border-radius: 8px; font-size: 15px;
      font-weight: 500; cursor: pointer; border: 1px solid #d0d0d0;
      background: white; color: #1a1a1a; font-family: inherit;
    }
    button.primary { background: #0D1B3E; color: white; border-color: #0D1B3E; }
    button.refuse  { color: #6b7280; }
  </style>
</head>
<body>
  <div class="card">
    ${content}
  </div>
</body>
</html>`
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const admin = makeAdmin()

  const { data: client } = await admin
    .from('deal_clients')
    .select('id, client_name, consent_status')
    .eq('consent_token', token)
    .single()

  if (!client) {
    return new Response(page('Invalid link', `
      <h1>Link not found</h1>
      <p>This consent link is invalid or has expired. Please contact your advisor.</p>
    `), { headers: { 'Content-Type': 'text/html' } })
  }

  if (client.consent_status !== 'pending') {
    const label = client.consent_status === 'consented' ? 'consented' : 'declined'
    return new Response(page('Already responded', `
      <h1>Already responded</h1>
      <p>Thank you, ${client.client_name}. You have already ${label} to this transfer. No further action is needed.</p>
    `), { headers: { 'Content-Type': 'text/html' } })
  }

  return new Response(page('Consent — Insurance Policy Transfer', `
    <h1>Hi ${client.client_name},</h1>
    <p>Please indicate your consent to the transfer of your insurance book.</p>
    <div class="actions">
      <form method="POST">
        <input type="hidden" name="response" value="consented">
        <button type="submit" class="primary">I consent</button>
      </form>
      <form method="POST">
        <input type="hidden" name="response" value="refused">
        <button type="submit" class="refuse">I do not consent</button>
      </form>
    </div>
  `), { headers: { 'Content-Type': 'text/html' } })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const admin = makeAdmin()

  const { data: client } = await admin
    .from('deal_clients')
    .select('id, client_name, consent_status')
    .eq('consent_token', token)
    .single()

  if (!client) {
    return new Response(page('Error', `
      <h1>Invalid link</h1>
      <p>This consent link is invalid or has expired.</p>
    `), { headers: { 'Content-Type': 'text/html' } })
  }

  if (client.consent_status !== 'pending') {
    return new Response(page('Already responded', `
      <h1>Already responded</h1>
      <p>Thank you, ${client.client_name}. Your response has already been recorded.</p>
    `), { headers: { 'Content-Type': 'text/html' } })
  }

  // Parse response from form submission
  let response: string | null = null
  const contentType = req.headers.get('content-type') ?? ''
  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    response = formData.get('response') as string | null
  } else {
    try { response = (await req.json()).response } catch { /* ignore */ }
  }

  if (response !== 'consented' && response !== 'refused') {
    return new Response(page('Error', `
      <h1>Invalid response</h1>
      <p>Please use the buttons on the consent page.</p>
    `), { headers: { 'Content-Type': 'text/html' } })
  }

  await admin
    .from('deal_clients')
    .update({
      consent_status:       response,
      consent_responded_at: new Date().toISOString(),
    })
    .eq('id', client.id)

  const consented = response === 'consented'
  return new Response(page('Thank you', `
    <h1>Thank you, ${client.client_name}.</h1>
    <p>${consented
      ? 'Your consent has been recorded. Your advisor has been notified.'
      : 'Your response has been recorded. Your advisor has been notified.'
    }</p>
  `), { headers: { 'Content-Type': 'text/html' } })
}
