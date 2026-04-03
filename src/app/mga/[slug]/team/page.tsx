'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

type TeamMember = {
  id: string
  role: string
  created_at: string
  user_id: string
  email?: string
}

export default function TeamPage() {
  const params = useParams()
  const slug = params.slug as string

  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [mgaId, setMgaId] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('staff')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadTeam()
  }, [])

  async function loadTeam() {
    setLoading(true)

    const { data: mga } = await supabase
      .from('mgas')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!mga) return
    setMgaId(mga.id)

    const { data: { user } } = await supabase.auth.getUser()

    const { data: teamRows } = await supabase
      .from('mga_users')
      .select('id, role, created_at, user_id')
      .eq('mga_id', mga.id)
      .order('created_at', { ascending: true })

    if (!teamRows) return

    // Get current user's role
    const mine = teamRows.find((r) => r.user_id === user?.id)
    setCurrentUserRole(mine?.role ?? null)

    // Fetch emails from auth.users via API route
    const res = await fetch('/api/mga/team/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_ids: teamRows.map((r) => r.user_id) }),
    })
    const emailMap: Record<string, string> = res.ok ? await res.json() : {}

    setMembers(teamRows.map((r) => ({ ...r, email: emailMap[r.user_id] ?? '—' })))
    setLoading(false)
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteLoading(true)
    setAlert(null)

    const res = await fetch('/api/mga/team/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mga_id: mgaId, email: inviteEmail, role: inviteRole }),
    })
    const data = await res.json()

    if (!res.ok) {
      setAlert({ type: 'error', message: data.error })
    } else {
      setAlert({ type: 'success', message: `Invite sent to ${inviteEmail}.` })
      setInviteEmail('')
      setInviteRole('staff')
      setShowInvite(false)
      loadTeam()
    }

    setInviteLoading(false)
  }

  function initials(email: string) {
    return email.charAt(0).toUpperCase()
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-CA', {
      month: 'short', day: 'numeric', year: 'numeric'
    })
  }

  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin'

  return (
    <main className="mga-page">
      <div className="mga-page-header-row">
        <div>
          <h1 className="mga-page-title">Team</h1>
          <p className="mga-page-sub">
            Manage who has access to your Novation instance.
          </p>
        </div>
        {canManage && (
          <button
            className="mga-btn mga-btn--primary"
            onClick={() => setShowInvite(!showInvite)}
          >
            + Invite team member
          </button>
        )}
      </div>

      {alert && (
        <div className={`mga-alert mga-alert--${alert.type}`}>
          {alert.message}
        </div>
      )}

      {showInvite && canManage && (
        <div className="mga-form-card" style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--midnight)', marginBottom: '20px' }}>
            Invite team member
          </div>
          <form onSubmit={handleInvite}>
            <div className="mga-form-grid">
              <div className="mga-form-field">
                <label className="mga-form-label">Email address *</label>
                <input
                  className="mga-form-input"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  required
                />
              </div>
              <div className="mga-form-field">
                <label className="mga-form-label">Role *</label>
                <select
                  className="mga-form-select"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="admin">Admin — import, release, manage team</option>
                  <option value="staff">Staff — view advisors and status only</option>
                </select>
              </div>
            </div>
            <div className="mga-form-actions">
              <button
                type="submit"
                className="mga-btn mga-btn--primary"
                disabled={inviteLoading}
              >
                {inviteLoading ? 'Sending…' : 'Send invite'}
              </button>
              <button
                type="button"
                className="mga-btn mga-btn--ghost"
                onClick={() => setShowInvite(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="mga-loading">Loading team…</div>
      ) : (
        <>
          <div style={{ fontSize: '12px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gray-500)', marginBottom: '12px' }}>
            {members.length} member{members.length !== 1 ? 's' : ''}
          </div>
          <div className="mga-team-grid">
            {members.map((member) => (
              <div key={member.id} className="mga-team-card">
                <div className="mga-team-avatar">
                  {initials(member.email ?? '?')}
                </div>
                <div className="mga-team-info">
                  <div className="mga-team-name">{member.email}</div>
                  <div className="mga-team-email">Joined {formatDate(member.created_at)}</div>
                </div>
                <span className={`mga-role-badge mga-role-badge--${member.role}`}>
                  {member.role}
                </span>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: '32px',
            padding: '20px 24px',
            background: 'var(--white)',
            border: '1px solid rgba(11,31,58,0.07)',
            borderRadius: '12px',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--midnight)', marginBottom: '12px' }}>
              Role permissions
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 500, color: 'var(--gray-500)', borderBottom: '1px solid rgba(11,31,58,0.06)' }}>Permission</th>
                  <th style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 500, color: 'var(--gray-500)', borderBottom: '1px solid rgba(11,31,58,0.06)' }}>Owner</th>
                  <th style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 500, color: 'var(--gray-500)', borderBottom: '1px solid rgba(11,31,58,0.06)' }}>Admin</th>
                  <th style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 500, color: 'var(--gray-500)', borderBottom: '1px solid rgba(11,31,58,0.06)' }}>Staff</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['View advisors', true, true, true],
                  ['Import CSV', true, true, false],
                  ['Add advisor manually', true, true, false],
                  ['Release / revoke invites', true, true, false],
                  ['Manage team members', true, true, false],
                  ['Billing & settings', true, false, false],
                ].map(([label, owner, admin, staff]) => (
                  <tr key={label as string}>
                    <td style={{ padding: '10px 0', color: 'var(--gray-700)', borderBottom: '1px solid rgba(11,31,58,0.04)' }}>{label}</td>
                    {[owner, admin, staff].map((allowed, i) => (
                      <td key={i} style={{ textAlign: 'center', padding: '10px 12px', borderBottom: '1px solid rgba(11,31,58,0.04)' }}>
                        {allowed ? (
                          <span style={{ color: '#16a34a', fontSize: '16px' }}>✓</span>
                        ) : (
                          <span style={{ color: 'var(--gray-300)', fontSize: '16px' }}>—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  )
}