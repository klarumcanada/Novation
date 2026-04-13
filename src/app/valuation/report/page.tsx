'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const BRAND = {
  midnight: '#0D1B3E',
  electric: '#3B82F6',
  voltage: '#E8C547',
  chalk: '#F0EDE7',
  linen: '#F0EDE7',
}

const PRODUCT_LABELS: Record<string, string> = {
  life: 'Life Insurance',
  disability: 'Disability Insurance',
  critical_illness: 'Critical Illness',
  health: 'Health & Benefits',
  seg_funds: 'Segregated Funds',
}

const PRODUCT_DESCRIPTIONS: Record<string, string> = {
  life: 'Permanent and term life policies with recurring renewal commissions.',
  disability: 'Individual and group disability income protection policies.',
  critical_illness: 'Lump-sum benefit policies for critical health events.',
  health: 'Extended health, dental, and group benefits contracts.',
  seg_funds: 'Segregated fund contracts with ongoing trailer commissions.',
}

type Valuation = {
  id: string
  low_value: number
  high_value: number
  breakdown: Record<string, {
    revenue: number
    multiple_low: number
    multiple_high: number
    value_low: number
    value_high: number
  }>
  persistency_rate: number
  transition_factor: number
  total_policies: number
  active_policies: number
  calculated_at: string
  shared_with_buyer: boolean
  advisor_name: string | null
  advisor_province: string | null
  advisor_years: number | null
  mga_name: string | null
}

function formatMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toLocaleString()}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

export default function ValuationReportPage() {
  const router = useRouter()
  const [valuation, setValuation] = useState<Valuation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/valuations')
      .then(r => r.json())
      .then(data => { setValuation(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ background: 'white', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF' }}>Loading report…</p>
    </div>
  )

  if (!valuation) return (
    <div style={{ background: 'white', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF' }}>No valuation found.</p>
      <button onClick={() => router.back()} style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: BRAND.electric, background: 'none', border: 'none', cursor: 'pointer' }}>← Go back</button>
    </div>
  )

  const totalRevenue = Object.values(valuation.breakdown).reduce((sum, r) => sum + r.revenue, 0)

  return (
    <div style={{ background: '#F8F9FB', minHeight: '100vh', paddingBottom: '4rem' }}>

      {/* Top bar — hidden in print */}
      <div className="no-print" style={{ background: 'white', borderBottom: '1px solid #E2E6F0', padding: '12px 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => router.back()}
          style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          ← Back
        </button>
        <button
          onClick={() => window.print()}
          style={{
            padding: '8px 18px', fontSize: '13px', fontWeight: 600,
            fontFamily: 'DM Sans, sans-serif', borderRadius: '8px',
            border: 'none', background: BRAND.midnight, color: 'white', cursor: 'pointer',
          }}
        >
          Download PDF
        </button>
      </div>

      {/* Report */}
      <div id="report" style={{ maxWidth: '760px', margin: '2rem auto', background: 'white', borderRadius: '12px', border: '1px solid #E2E6F0', overflow: 'hidden' }}>

        {/* Header band */}
        <div style={{ background: BRAND.midnight, padding: '2.5rem 2.5rem 2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
            {/* Klarum logo mark */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="32" height="22" viewBox="0 0 44 30" fill="none">
                <rect x="1" y="1" width="3.5" height="28" fill="white" />
                <path d="M4.5 15 L18 1" stroke="white" strokeWidth="3" strokeLinecap="square" />
                <path d="M4.5 15 L18 29" stroke="white" strokeWidth="3" strokeLinecap="square" />
                <line x1="18" y1="4" x2="34" y2="15" stroke="white" strokeWidth="0.75" opacity="0.4" />
                <line x1="18" y1="26" x2="34" y2="15" stroke="white" strokeWidth="0.75" opacity="0.4" />
                <circle cx="34" cy="15" r="7" fill={BRAND.electric} />
              </svg>
              <div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '15px', fontWeight: 600, color: 'white', letterSpacing: '.02em' }}>klarum</div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.5)', letterSpacing: '.1em', textTransform: 'uppercase' }}>Novation</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '2px' }}>Prepared for</div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: 'white' }}>{valuation.advisor_name ?? '—'}</div>
              {valuation.mga_name && (
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{valuation.mga_name}</div>
              )}
            </div>
          </div>

          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.45)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
            Book of Business — Indicative Valuation
          </div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '38px', fontWeight: 600, color: 'white', letterSpacing: '-.01em' }}>
            {formatMoney(valuation.low_value)} – {formatMoney(valuation.high_value)}
          </div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginTop: '6px' }}>
            Calculated {formatDate(valuation.calculated_at)} · {valuation.advisor_province ?? ''}
          </div>
        </div>

        {/* Headline stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid #F3F4F6' }}>
          {[
            { label: 'Total Policies', value: valuation.total_policies.toString() },
            { label: 'Active Policies', value: valuation.active_policies.toString() },
            { label: 'Persistency Rate', value: `${Math.round(valuation.persistency_rate * 100)}%` },
            { label: 'Annual Revenue', value: formatMoney(totalRevenue) },
          ].map((stat, i) => (
            <div key={stat.label} style={{
              padding: '1.25rem',
              borderRight: i < 3 ? '1px solid #F3F4F6' : 'none',
            }}>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
                {stat.label}
              </div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 600, color: BRAND.midnight }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '2rem 2.5rem' }}>

          {/* Methodology */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
              Valuation Methodology
            </div>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#374151', lineHeight: 1.75, margin: '0 0 10px' }}>
              This valuation applies a revenue multiple method, the industry standard for life and health insurance book-of-business transactions in Canada. Recurring annual commission revenue is segmented by product type, and an indicative multiple range is applied to each segment based on market comparables and product-specific risk characteristics.
            </p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#374151', lineHeight: 1.75, margin: 0 }}>
              The resulting range reflects the realistic transaction value a qualified buyer would offer for this book under current market conditions, adjusted for persistency and transition factors specific to this advisor.
            </p>
          </div>

          {/* Adjustments */}
          <div style={{ background: '#F8F9FB', borderRadius: '10px', padding: '1.25rem', marginBottom: '2rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Persistency Adjustment</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: 600, color: BRAND.midnight, marginBottom: '3px' }}>
                {Math.round(valuation.persistency_rate * 100)}%
              </div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#6B7280', margin: 0, lineHeight: 1.6 }}>
                {valuation.active_policies} of {valuation.total_policies} policies remain active. {valuation.persistency_rate >= 0.90 ? 'Strong persistency supports a full multiple.' : valuation.persistency_rate >= 0.85 ? 'Persistency is within acceptable range; a modest discount is applied.' : 'A persistency floor of 85% is applied to revenue.'}
              </p>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Transition Premium</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: 600, color: BRAND.midnight, marginBottom: '3px' }}>
                {valuation.transition_factor > 0 ? `+${valuation.transition_factor}x` : 'Not applied'}
              </div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#6B7280', margin: 0, lineHeight: 1.6 }}>
                {valuation.transition_factor > 0
                  ? 'Advisor is open to staying on post-sale. A +0.25x premium is added to the high end of each product multiple to reflect reduced client attrition risk.'
                  : 'Advisor has not indicated willingness to stay on post-sale. No transition premium is applied.'}
              </p>
            </div>
          </div>

          {/* Product breakdown */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
              Product Breakdown
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(valuation.breakdown).map(([type, row]) => (
                <div key={type} style={{ background: 'white', border: '1px solid #E2E6F0', borderRadius: '10px', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 600, color: BRAND.midnight, marginBottom: '2px' }}>
                        {PRODUCT_LABELS[type] ?? type}
                      </div>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#9CA3AF' }}>
                        {PRODUCT_DESCRIPTIONS[type] ?? ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1rem' }}>
                      <div style={{ fontFamily: 'Georgia, serif', fontSize: '16px', fontWeight: 600, color: BRAND.midnight }}>
                        {formatMoney(row.value_low)} – {formatMoney(row.value_high)}
                      </div>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                        {row.multiple_low}x – {row.multiple_high}x multiple
                      </div>
                    </div>
                  </div>
                  {/* Revenue bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ flex: 1, height: '4px', background: '#F3F4F6', borderRadius: '100px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: '100px', background: BRAND.electric,
                        width: `${Math.round((row.revenue / totalRevenue) * 100)}%`,
                      }} />
                    </div>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                      {formatMoney(row.revenue)} revenue · {Math.round((row.revenue / totalRevenue) * 100)}% of book
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div style={{ background: BRAND.midnight, borderRadius: '10px', padding: '1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.5)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
                Indicative Total Range
              </div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: 600, color: 'white' }}>
                {formatMoney(valuation.low_value)} – {formatMoney(valuation.high_value)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Total annual revenue</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: 600, color: 'white' }}>{formatMoney(totalRevenue)}</div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                Blended {(valuation.low_value / totalRevenue).toFixed(1)}x – {(valuation.high_value / totalRevenue).toFixed(1)}x
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '1.5rem' }}>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#9CA3AF', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Important Disclaimer
            </div>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#9CA3AF', lineHeight: 1.75, margin: 0 }}>
              This report is prepared by Klarum Inc. for informational purposes only and does not constitute a formal appraisal, valuation opinion, or financial advice. The indicative range is based on in-force policy data provided by the advisor's managing general agent and applies industry-standard revenue multiple benchmarks. Actual transaction values may differ materially based on buyer due diligence, financing terms, client concentration, carrier contract transferability, and other factors not captured in this model. This report is confidential and intended solely for the use of the named advisor. Klarum Inc. assumes no liability for decisions made based on this report.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div style={{ background: BRAND.midnight, padding: '1rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
            © {new Date().getFullYear()} Klarum Inc. · klarum.ca
          </div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
            Confidential · {valuation.advisor_name ?? ''}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          #report { 
            border: none !important; 
            border-radius: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  )
}