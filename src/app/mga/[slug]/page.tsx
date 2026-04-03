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

  // Get MGA
  const { data: mga } = await supabase
    .from('mgas')
    .select('id, name')
    .eq('slug', slug)
    .single()

  if (!mga) return null

  // Get counts by status
  const { data: advisors } = await supabase
    .from('mga_advisors')
    .select('status')
    .eq('mga_id', mga.id)

  const counts = {
    pending: 0,
    invited: 0,
    registered: 0,
    active: 0,
  }

  advisors?.forEach((a) => {
    if (a.status in counts) counts[a.status as keyof typeof counts]++
  })

  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <main className="mga-page">
      <div className="mga-page-header-row">
        <div>
          <h1 className="mga-page-title">Dashboard</h1>
          <p className="mga-page-sub">
            {total} advisor{total !== 1 ? 's' : ''} in your Novation instance
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href={`/mga/${slug}/advisors/import`} className="mga-btn mga-btn--secondary">
            Import advisors
          </Link>
          <Link href={`/mga/${slug}/advisors/new`} className="mga-btn mga-btn--primary">
            + Add advisor
          </Link>
        </div>
      </div>

      <div className="mga-stat-grid">
        <div className="mga-stat-card mga-stat-card--pending">
          <div className="mga-stat-label">Pending</div>
          <div className="mga-stat-value">{counts.pending}</div>
          <div className="mga-stat-hint">Imported, not yet released</div>
        </div>
        <div className="mga-stat-card mga-stat-card--invited">
          <div className="mga-stat-label">Invited</div>
          <div className="mga-stat-value">{counts.invited}</div>
          <div className="mga-stat-hint">Invite sent, awaiting signup</div>
        </div>
        <div className="mga-stat-card mga-stat-card--registered">
          <div className="mga-stat-label">Registered</div>
          <div className="mga-stat-value">{counts.registered}</div>
          <div className="mga-stat-hint">Signed up, profile incomplete</div>
        </div>
        <div className="mga-stat-card mga-stat-card--active">
          <div className="mga-stat-label">Active</div>
          <div className="mga-stat-value">{counts.active}</div>
          <div className="mga-stat-hint">Profile complete, on marketplace</div>
        </div>
      </div>

      {total === 0 ? (
        <div className="mga-card">
          <div className="mga-empty">
            <div className="mga-empty-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="mga-empty-title">No advisors yet</div>
            <div className="mga-empty-sub">
              Import a CSV from your backoffice or add advisors one at a time.
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <Link href={`/mga/${slug}/advisors/import`} className="mga-btn mga-btn--secondary">
                Import CSV
              </Link>
              <Link href={`/mga/${slug}/advisors/new`} className="mga-btn mga-btn--primary">
                + Add advisor
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="mga-card">
          <div className="mga-table-toolbar">
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--midnight)' }}>
              Recent activity
            </span>
            <Link
              href={`/mga/${slug}/advisors`}
              className="mga-btn mga-btn--ghost mga-btn--sm"
              style={{ marginLeft: 'auto' }}
            >
              View all →
            </Link>
          </div>
          <table className="mga-table">
            <thead>
              <tr>
                <th>Advisor</th>
                <th>Province</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {advisors?.slice(0, 5).map((a, i) => (
                <tr key={i}>
                  <td>
                    <div className="mga-table-name">—</div>
                  </td>
                  <td>—</td>
                  <td>
                    <span className={`mga-status mga-status--${a.status}`}>
                      {a.status}
                    </span>
                  </td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}