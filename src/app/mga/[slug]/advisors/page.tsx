'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

type Advisor = {
  id: string
  full_name: string
  email: string
  phone: string | null
  province: string | null
  years_in_practice: number | null
  external_id: string | null
  entity_type: string | null
  corporation_name: string | null
  status: string
  invited_at: string | null
  registered_at: string | null
  created_at: string
}

export default function AdvisorsPage() {
  const params = useParams()
  const slug = params.slug as string
  const router = useRouter()

  const [advisors, setAdvisors] = useState<Advisor[]>([])
  const [filtered, setFiltered] = useState<Advisor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [mgaId, setMgaId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadAdvisors()
  }, [])

  useEffect(() => {
    let result = advisors
    if (statusFilter !== 'all') {
      result = result.filter((a) => a.status === statusFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (a) =>
          a.full_name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          a.external_id?.toLowerCase().includes(q)
      )
    }
    setFiltered(result)
  }, [advisors, search, statusFilter])

  async function loadAdvisors() {
    setLoading(true)
    const { data: mga } = await supabase
      .from('mgas')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!mga) return

    setMgaId(mga.id)

    const { data } = await supabase
      .from('mga_advisors')
      .select('*')
      .eq('mga_id', mga.id)
      .order('created_at', { ascending: false })

    setAdvisors(data ?? [])
    setFiltered(data ?? [])
    setLoading(false)
  }

  async function handleRelease(advisor: Advisor) {
    setActionLoading(advisor.id)
    setAlert(null)
    try {
      const res = await fetch(`/api/mga/advisors/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mga_advisor_id: advisor.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAlert({ type: 'success', message: `Invite sent to ${advisor.full_name}.` })
      loadAdvisors()
    } catch (e: any) {
      setAlert({ type: 'error', message: e.message })
    } finally {
      setActionLoading(null)
    }
  }

  async function handleRevoke(advisor: Advisor) {
    if (!confirm(`Revoke invite for ${advisor.full_name}? They will no longer be able to register.`)) return
    setActionLoading(advisor.id)
    setAlert(null)
    try {
      const { error } = await supabase
        .from('mga_advisors')
        .update({ status: 'pending', invite_code_id: null, invited_at: null })
        .eq('id', advisor.id)
      if (error) throw error
      setAlert({ type: 'success', message: `Invite revoked for ${advisor.full_name}.` })
      loadAdvisors()
    } catch (e: any) {
      setAlert({ type: 'error', message: e.message })
    } finally {
      setActionLoading(null)
    }
  }

  function formatDate(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-CA', {
      month: 'short', day: 'numeric', year: 'numeric'
    })
  }

  const counts = {
    all: advisors.length,
    pending: advisors.filter((a) => a.status === 'pending').length,
    invited: advisors.filter((a) => a.status === 'invited').length,
    registered: advisors.filter((a) => a.status === 'registered').length,
    active: advisors.filter((a) => a.status === 'active').length,
  }

  return (
    <main className="mga-page">
      <div className="mga-page-header-row">
        <div>
          <h1 className="mga-page-title">Advisors</h1>
          <p className="mga-page-sub">{advisors.length} total in your instance</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href={`/mga/${slug}/advisors/import`} className="mga-btn mga-btn--secondary">
            Import CSV
          </Link>
          <Link href={`/mga/${slug}/advisors/new`} className="mga-btn mga-btn--primary">
            + Add advisor
          </Link>
        </div>
      </div>

      {alert && (
        <div className={`mga-alert mga-alert--${alert.type}`}>
          {alert.message}
        </div>
      )}

      <div className="mga-card">
        <div className="mga-table-toolbar">
          <input
            className="mga-search"
            placeholder="Search by name, email, or external ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="mga-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All ({counts.all})</option>
            <option value="pending">Pending ({counts.pending})</option>
            <option value="invited">Invited ({counts.invited})</option>
            <option value="registered">Registered ({counts.registered})</option>
            <option value="active">Active ({counts.active})</option>
          </select>
        </div>

        {loading ? (
          <div className="mga-loading">Loading advisors…</div>
        ) : filtered.length === 0 ? (
          <div className="mga-empty">
            <div className="mga-empty-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
            </div>
            <div className="mga-empty-title">No advisors found</div>
            <div className="mga-empty-sub">
              {search || statusFilter !== 'all'
                ? 'Try adjusting your search or filter.'
                : 'Import a CSV or add advisors one at a time.'}
            </div>
            {!search && statusFilter === 'all' && (
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <Link href={`/mga/${slug}/advisors/import`} className="mga-btn mga-btn--secondary">
                  Import CSV
                </Link>
                <Link href={`/mga/${slug}/advisors/new`} className="mga-btn mga-btn--primary">
                  + Add advisor
                </Link>
              </div>
            )}
          </div>
        ) : (
          <table className="mga-table">
            <thead>
              <tr>
                <th>Advisor</th>
                <th>Province</th>
                <th>Experience</th>
                <th>External ID</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((advisor) => (
                <tr key={advisor.id}>
                  <td>
                    <div className="mga-table-name">{advisor.full_name}</div>
                    <div className="mga-table-sub">{advisor.email}</div>
                    {advisor.entity_type === 'corporation' && (
                      <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center',
                          padding: '2px 8px', fontSize: '11px', fontWeight: 500,
                          fontFamily: 'DM Sans, sans-serif', borderRadius: '20px',
                          background: '#DBEAFE', color: '#1D4ED8', border: '1px solid #BFDBFE',
                        }}>
                          Corporation
                        </span>
                        {advisor.corporation_name && (
                          <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                            {advisor.corporation_name}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td>{advisor.province ?? '—'}</td>
                  <td>
                    {advisor.years_in_practice
                      ? `${advisor.years_in_practice} yrs`
                      : '—'}
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--gray-500)' }}>
                      {advisor.external_id ?? '—'}
                    </span>
                  </td>
                  <td>
                    <span className={`mga-status mga-status--${advisor.status}`}>
                      {advisor.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--gray-500)' }}>
                    {advisor.status === 'invited'
                      ? formatDate(advisor.invited_at)
                      : advisor.status === 'registered'
                      ? formatDate(advisor.registered_at)
                      : formatDate(advisor.created_at)}
                  </td>
                  <td>
                    <div className="mga-table-actions">
                      {advisor.status === 'pending' && (
                        <button
                          className="mga-btn mga-btn--release mga-btn--sm"
                          onClick={() => handleRelease(advisor)}
                          disabled={actionLoading === advisor.id}
                        >
                          {actionLoading === advisor.id ? 'Sending…' : 'Release'}
                        </button>
                      )}
                      {advisor.status === 'invited' && (
                        <>
                          <button
                            className="mga-btn mga-btn--ghost mga-btn--sm"
                            onClick={() => handleRelease(advisor)}
                            disabled={actionLoading === advisor.id}
                          >
                            Resend
                          </button>
                          <button
                            className="mga-btn mga-btn--danger mga-btn--sm"
                            onClick={() => handleRevoke(advisor)}
                            disabled={actionLoading === advisor.id}
                          >
                            Revoke
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  )
}