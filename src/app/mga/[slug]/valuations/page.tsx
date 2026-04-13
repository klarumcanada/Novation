import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import Link from 'next/link'

function formatMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toLocaleString()}`
}

export default async function MgaValuationsPage({
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

  const { data: mga } = await supabase
    .from('mgas')
    .select('id, name')
    .eq('slug', slug)
    .single()

  if (!mga) return null

  const { data: advisors } = await supabase
    .from('advisors')
    .select('id, full_name, province, years_in_practice')
    .eq('mga_id', mga.id)

  const advisorIds = (advisors ?? []).map(a => a.id)
  const advisorMap = Object.fromEntries((advisors ?? []).map(a => [a.id, a]))

  const { data: valuations } = await supabase
    .from('book_valuations')
    .select('*')
    .in('advisor_id', advisorIds.length > 0 ? advisorIds : ['none'])
    .eq('status', 'complete')
    .order('calculated_at', { ascending: false })

  return (
    <main className="mga-page">
      <div className="mga-page-header-row">
        <div>
          <h1 className="mga-page-title">Book Value Reports</h1>
          <p className="mga-page-sub">{(valuations ?? []).length} advisor{(valuations ?? []).length !== 1 ? 's have' : ' has'} run a valuation</p>
        </div>
      </div>

      {(valuations ?? []).length === 0 ? (
        <div className="mga-card">
          <div className="mga-empty">
            <div className="mga-empty-title">No valuations yet</div>
            <div className="mga-empty-sub">Reports will appear here once advisors calculate their book value.</div>
          </div>
        </div>
      ) : (
        <div className="mga-card">
          <table className="mga-table">
            <thead>
              <tr>
                <th>Advisor</th>
                <th>Province</th>
                <th>Indicative Range</th>
                <th>Policies</th>
                <th>Persistency</th>
                <th>Calculated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(valuations ?? []).map(v => {
                const advisor = advisorMap[v.advisor_id]
                return (
                  <tr key={v.id}>
                    <td><div className="mga-table-name">{advisor?.full_name ?? '—'}</div></td>
                    <td>{advisor?.province ?? '—'}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#0D1B3E', fontSize: '13px' }}>
                        {formatMoney(v.low_value)} – {formatMoney(v.high_value)}
                      </span>
                    </td>
                    <td style={{ fontSize: '13px', color: '#374151' }}>
                      {v.active_policies} / {v.total_policies}
                    </td>
                    <td style={{ fontSize: '13px', color: '#374151' }}>
                      {Math.round(v.persistency_rate * 100)}%
                    </td>
                    <td style={{ fontSize: '12px', color: '#9CA3AF' }}>
                      {new Date(v.calculated_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td>
                      <Link
                        href={`/mga/${slug}/valuations/${v.advisor_id}`}
                        style={{ fontSize: '12px', color: '#3B82F6', fontWeight: 500, textDecoration: 'none' }}
                      >
                        View report →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}