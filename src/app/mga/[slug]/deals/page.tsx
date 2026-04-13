import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import Link from 'next/link'

const STAGES = ['interested', 'loi', 'due_diligence', 'closed'] as const
type Stage = typeof STAGES[number]

const STAGE_LABELS: Record<Stage, string> = {
  interested: 'Interested',
  loi: 'Letter of Intent',
  due_diligence: 'Due Diligence',
  closed: 'Closed',
}

const STAGE_COLORS: Record<Stage, { bg: string; color: string }> = {
  interested: { bg: '#EFF6FF', color: '#1D4ED8' },
  loi:        { bg: '#FEF9EC', color: '#92400E' },
  due_diligence: { bg: '#F5F3FF', color: '#6D28D9' },
  closed:     { bg: '#D1FAE5', color: '#065F46' },
}

function formatMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toLocaleString()}`
}

export default async function MgaDealsPage({
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
    .select('id, full_name')
    .eq('mga_id', mga.id)

  const advisorIds = (advisors ?? []).map(a => a.id)
  const advisorMap = Object.fromEntries((advisors ?? []).map(a => [a.id, a.full_name]))

  const { data: deals } = await supabase
    .from('deals')
    .select('*')
    .or(advisorIds.length > 0 ? `seller_id.in.(${advisorIds.join(',')}),buyer_id.in.(${advisorIds.join(',')})` : 'id.is.null')
    .order('updated_at', { ascending: false })

  const dealIds = (deals ?? []).map(d => d.id)

  const { data: valuations } = await supabase
    .from('book_valuations')
    .select('deal_id, low_value, high_value, shared_with_buyer, advisor_id')
    .in('deal_id', dealIds.length > 0 ? dealIds : ['none'])

  const valuationMap = Object.fromEntries((valuations ?? []).map(v => [v.deal_id, v]))

  const stageCounts = STAGES.reduce((acc, s) => ({ ...acc, [s]: 0 }), {} as Record<Stage, number>)
  ;(deals ?? []).forEach(d => { if (d.status in stageCounts) stageCounts[d.status as Stage]++ })

  return (
    <main className="mga-page">
      <div className="mga-page-header-row">
        <div>
          <h1 className="mga-page-title">Deals in Flight</h1>
          <p className="mga-page-sub">{(deals ?? []).length} deal{(deals ?? []).length !== 1 ? 's' : ''} across your advisor network</p>
        </div>
      </div>

      {/* Stage summary */}
      <div className="mga-stat-grid" style={{ marginBottom: '1.5rem' }}>
        {STAGES.map(stage => (
          <div key={stage} className="mga-stat-card" style={{ borderTop: `3px solid ${STAGE_COLORS[stage].color}` }}>
            <div className="mga-stat-label">{STAGE_LABELS[stage]}</div>
            <div className="mga-stat-value">{stageCounts[stage]}</div>
            <div className="mga-stat-hint">active deals</div>
          </div>
        ))}
      </div>

      {(deals ?? []).length === 0 ? (
        <div className="mga-card">
          <div className="mga-empty">
            <div className="mga-empty-title">No deals yet</div>
            <div className="mga-empty-sub">Deals will appear here once advisors begin the succession process.</div>
          </div>
        </div>
      ) : (
        <div className="mga-card">
          <table className="mga-table">
            <thead>
              <tr>
                <th>Seller</th>
                <th>Buyer</th>
                <th>Stage</th>
                <th>Book Value</th>
                <th>Shared</th>
                <th>Last Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(deals ?? []).map(deal => {
                const val = valuationMap[deal.id]
                const colors = STAGE_COLORS[deal.status as Stage] ?? STAGE_COLORS.interested
                return (
                  <tr key={deal.id}>
                    <td><div className="mga-table-name">{advisorMap[deal.seller_id] ?? '—'}</div></td>
                    <td><div className="mga-table-name">{advisorMap[deal.buyer_id] ?? '—'}</div></td>
                    <td>
                      <span className="mga-status" style={{ background: colors.bg, color: colors.color }}>
                        {STAGE_LABELS[deal.status as Stage] ?? deal.status}
                      </span>
                    </td>
                    <td>
                      {val
                        ? <span style={{ fontWeight: 600, color: '#0D1B3E', fontSize: '13px' }}>{formatMoney(val.low_value)} – {formatMoney(val.high_value)}</span>
                        : <span style={{ color: '#9CA3AF', fontSize: '13px' }}>Not calculated</span>
                      }
                    </td>
                    <td>
                      {val
                        ? val.shared_with_buyer
                          ? <span style={{ color: '#065F46', fontSize: '12px', fontWeight: 500 }}>✓ Shared</span>
                          : <span style={{ color: '#9CA3AF', fontSize: '12px' }}>Not shared</span>
                        : <span style={{ color: '#E5E7EB', fontSize: '12px' }}>—</span>
                      }
                    </td>
                    <td style={{ fontSize: '12px', color: '#9CA3AF' }}>
                      {new Date(deal.updated_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td>
                      {val && (
                        <Link
                          href={`/mga/${slug}/valuations/${deal.seller_id}`}
                          style={{ fontSize: '12px', color: '#3B82F6', fontWeight: 500, textDecoration: 'none' }}
                        >
                          View report →
                        </Link>
                      )}
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