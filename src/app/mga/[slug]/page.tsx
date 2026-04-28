import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import Link from 'next/link'

export default async function MgaDashboard({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
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

  // MGA
  const { data: mga } = await supabase
    .from('mgas')
    .select('id, name')
    .eq('slug', slug)
    .single()

  if (!mga) return null

  // Advisor counts by status
  const { data: mgaAdvisors } = await supabase
    .from('mga_advisors')
    .select('status')
    .eq('mga_id', mga.id)

  const statuses = (mgaAdvisors ?? []).map(a => a.status)
  const advisorCounts = {
    pending:    statuses.filter(s => s === 'pending').length,
    invited:    statuses.filter(s => s === 'invited').length,
    registered: statuses.filter(s => s === 'registered').length,
    active:     statuses.filter(s => s === 'active').length,
  }
  const totalAdvisors = Object.values(advisorCounts).reduce((a, b) => a + b, 0)

  // Deal counts via advisor IDs
  const { data: advisors } = await supabase
    .from('advisors')
    .select('id')
    .eq('mga_id', mga.id)

  const advisorIds = (advisors ?? []).map(a => a.id)

  const dealCounts = { new: 0, inProgress: 0, closed: 0 }

  if (advisorIds.length > 0) {
    const { data: deals } = await supabase
      .from('deals')
      .select('id, status, created_at')
      .or(`seller_id.in.(${advisorIds.join(',')}),buyer_id.in.(${advisorIds.join(',')})`)

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    ;(deals ?? []).forEach(d => {
      if (d.created_at >= cutoff) dealCounts.new++
      if (d.status === 'closed' || d.status === 'canceled') dealCounts.closed++
      else dealCounts.inProgress++
    })
  }

  const sectionCard: React.CSSProperties = {
    background: 'white',
    border: '0.5px solid #E2E6F0',
    borderRadius: 12,
    padding: '24px 28px',
    marginBottom: 20,
  }

  const statCard: React.CSSProperties = {
    background: '#F0EDE7',
    borderRadius: 10,
    padding: '18px 20px',
  }

  return (
    <main style={{ background: '#F0EDE7', minHeight: '100vh', paddingBottom: '4rem' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 28px' }}>

        {/* Page header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{
            fontFamily: 'Playfair Display, Georgia, serif',
            fontSize: 28, fontWeight: 600, color: '#0D1B3E',
            margin: '0 0 6px',
          }}>
            Dashboard
          </h1>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#9CA3AF', margin: 0 }}>
            {mga.name} · {totalAdvisors} advisor{totalAdvisors !== 1 ? 's' : ''}
          </p>
        </div>

        {/* ── Advisors section ── */}
        <div style={sectionCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 600, color: '#0D1B3E', margin: 0 }}>
              Advisors
            </h2>
            <Link
              href={`/mga/${slug}/advisors`}
              style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#3B82F6', textDecoration: 'none' }}
            >
              View all advisors →
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Pending',    value: advisorCounts.pending,    hint: 'Imported, not yet released' },
              { label: 'Invited',    value: advisorCounts.invited,    hint: 'Invite sent, awaiting signup' },
              { label: 'Registered', value: advisorCounts.registered, hint: 'Signed up, profile incomplete' },
              { label: 'Active',     value: advisorCounts.active,     hint: 'Profile complete, on marketplace' },
            ].map(card => (
              <div key={card.label} style={statCard}>
                <div style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  color: '#888780', marginBottom: 8,
                }}>
                  {card.label}
                </div>
                <div style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: 30, fontWeight: 600,
                  color: '#0D1B3E', lineHeight: 1, marginBottom: 6,
                }}>
                  {card.value}
                </div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#9CA3AF' }}>
                  {card.hint}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Deals section ── */}
        <div style={sectionCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 600, color: '#0D1B3E', margin: 0 }}>
              Deals
            </h2>
            <Link
              href={`/mga/${slug}/deals`}
              style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#3B82F6', textDecoration: 'none' }}
            >
              View all deals →
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'New',         value: dealCounts.new,        hint: 'Created in the last 24 hours' },
              { label: 'In Progress', value: dealCounts.inProgress, hint: 'Active across all stages' },
              { label: 'Closed',      value: dealCounts.closed,     hint: 'Completed or cancelled' },
            ].map(card => (
              <div key={card.label} style={statCard}>
                <div style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  color: '#888780', marginBottom: 8,
                }}>
                  {card.label}
                </div>
                <div style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: 30, fontWeight: 600,
                  color: '#0D1B3E', lineHeight: 1, marginBottom: 6,
                }}>
                  {card.value}
                </div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#9CA3AF' }}>
                  {card.hint}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  )
}
