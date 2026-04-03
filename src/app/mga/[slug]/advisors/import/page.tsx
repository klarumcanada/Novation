'use client'
import { useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

type ParsedRow = {
  full_name: string
  email: string
  phone: string
  province: string
  years_in_practice: string
  external_id: string
  _error?: string
}

const REQUIRED = ['full_name', 'email']
const COLUMN_ALIASES: Record<string, string> = {
  name: 'full_name',
  'full name': 'full_name',
  'advisor name': 'full_name',
  'e-mail': 'email',
  'email address': 'email',
  telephone: 'phone',
  tel: 'phone',
  prov: 'province',
  province: 'province',
  years: 'years_in_practice',
  'years in practice': 'years_in_practice',
  experience: 'years_in_practice',
  'external id': 'external_id',
  'ext id': 'external_id',
  id: 'external_id',
  'backoffice id': 'external_id',
  'advisor id': 'external_id',
}

function normalizeHeader(h: string): string {
  const lower = h.trim().toLowerCase()
  return COLUMN_ALIASES[lower] ?? lower.replace(/\s+/g, '_')
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(normalizeHeader)
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
    const row: any = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? '' })

    const missing = REQUIRED.filter((f) => !row[f])
    if (missing.length > 0) {
      row._error = `Missing: ${missing.join(', ')}`
    }

    return row as ParsedRow
  }).filter((r) => Object.values(r).some((v) => v !== ''))
}

export default function ImportPage() {
  const params = useParams()
  const slug = params.slug as string
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [rows, setRows] = useState<ParsedRow[]>([])
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file.')
      return
    }
    setFileName(file.name)
    setError(null)
    setResult(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      setRows(parsed)
    }
    reader.readAsText(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function handleImport() {
    setLoading(true)
    setError(null)

    const validRows = rows.filter((r) => !r._error)

    const { data: mga } = await supabase
      .from('mgas')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!mga) {
      setError('MGA not found.')
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    let inserted = 0
    let skipped = 0

    for (const row of validRows) {
      const { error: insertError } = await supabase
        .from('mga_advisors')
        .insert({
          mga_id: mga.id,
          full_name: row.full_name.trim(),
          email: row.email.trim().toLowerCase(),
          phone: row.phone || null,
          province: row.province || null,
          years_in_practice: row.years_in_practice ? parseInt(row.years_in_practice) : null,
          external_id: row.external_id || null,
          imported_by: user?.id,
          status: 'pending',
        })

      if (insertError) {
        skipped++
      } else {
        inserted++
      }
    }

    setResult({ inserted, skipped })
    setLoading(false)
  }

  const validRows = rows.filter((r) => !r._error)
  const errorRows = rows.filter((r) => r._error)

  return (
    <main className="mga-page">
      <div className="mga-page-header-row">
        <div>
          <h1 className="mga-page-title">Import advisors</h1>
          <p className="mga-page-sub">
            Upload a CSV from your backoffice. Advisors land in the holding area — release them when ready.
          </p>
        </div>
        <Link href={`/mga/${slug}/advisors`} className="mga-btn mga-btn--secondary">
          ← Back
        </Link>
      </div>

      {error && (
        <div className="mga-alert mga-alert--error">{error}</div>
      )}

      {result && (
        <div className="mga-alert mga-alert--success">
          Import complete — {result.inserted} added, {result.skipped} skipped (duplicates).{' '}
          <Link href={`/mga/${slug}/advisors`} style={{ color: 'inherit', fontWeight: 500 }}>
            View advisors →
          </Link>
        </div>
      )}

      {rows.length === 0 && (
        <div className="mga-form-card" style={{ maxWidth: '100%' }}>
          <div
            className={`mga-import-zone ${dragging ? 'mga-import-zone--active' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <div className="mga-import-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div className="mga-import-title">Drop your CSV here</div>
            <div className="mga-import-sub">or click to browse</div>
            <span className="mga-btn mga-btn--secondary" style={{ pointerEvents: 'none' }}>
              Choose file
            </span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
          />

          <div style={{ marginTop: '28px', paddingTop: '24px', borderTop: '1px solid rgba(11,31,58,0.06)' }}>
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--gray-500)', marginBottom: '10px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Expected columns
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {['full_name *', 'email *', 'phone', 'province', 'years_in_practice', 'external_id'].map((col) => (
                <span key={col} style={{
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  padding: '4px 10px',
                  background: 'var(--chalk)',
                  border: '1px solid rgba(11,31,58,0.08)',
                  borderRadius: '6px',
                  color: col.includes('*') ? 'var(--midnight)' : 'var(--gray-500)'
                }}>
                  {col}
                </span>
              ))}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '10px', fontWeight: 300 }}>
              * Required. Common column name variations are handled automatically.
            </div>
          </div>
        </div>
      )}

      {rows.length > 0 && !result && (
        <div className="mga-form-card" style={{ maxWidth: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--midnight)', marginBottom: '2px' }}>
                {fileName}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--gray-500)', fontWeight: 300 }}>
                {validRows.length} valid row{validRows.length !== 1 ? 's' : ''}
                {errorRows.length > 0 && ` · ${errorRows.length} with errors (will be skipped)`}
              </div>
            </div>
            <button
              className="mga-btn mga-btn--ghost mga-btn--sm"
              onClick={() => { setRows([]); setFileName(null) }}
            >
              Change file
            </button>
          </div>

          <div className="mga-preview-table-wrap">
            <table className="mga-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Province</th>
                  <th>Experience</th>
                  <th>External ID</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    <td>
                      <div className="mga-table-name" style={row._error ? { color: '#dc2626' } : {}}>
                        {row.full_name || '—'}
                      </div>
                    </td>
                    <td style={{ fontSize: '13px' }}>{row.email || '—'}</td>
                    <td style={{ fontSize: '13px' }}>{row.province || '—'}</td>
                    <td style={{ fontSize: '13px' }}>
                      {row.years_in_practice ? `${row.years_in_practice} yrs` : '—'}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--gray-500)' }}>
                      {row.external_id || '—'}
                    </td>
                    <td>
                      {row._error ? (
                        <span className="mga-status" style={{ background: '#fee2e2', color: '#dc2626' }}>
                          {row._error}
                        </span>
                      ) : (
                        <span className="mga-status mga-status--pending">Ready</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mga-form-actions">
            <button
              className="mga-btn mga-btn--primary"
              onClick={handleImport}
              disabled={loading || validRows.length === 0}
            >
              {loading ? 'Importing…' : `Import ${validRows.length} advisor${validRows.length !== 1 ? 's' : ''}`}
            </button>
            <Link href={`/mga/${slug}/advisors`} className="mga-btn mga-btn--ghost">
              Cancel
            </Link>
          </div>
        </div>
      )}
    </main>
  )
}