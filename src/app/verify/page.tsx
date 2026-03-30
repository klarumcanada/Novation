export default function VerifyPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#F8F7F4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '28px', color: '#0D1B3E', letterSpacing: '-.02em' }}>
            klar<span style={{ color: '#3B82F6' }}>um</span>
          </div>
        </div>

        {/* Card */}
        <div style={{ background: 'white', borderRadius: '12px', border: '.5px solid #E5E7EB', padding: '2.5rem', textAlign: 'center' }}>
          
          {/* Icon */}
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="M2 7l10 7 10-7"/>
            </svg>
          </div>

          <h1 style={{ fontSize: '20px', fontWeight: '500', color: '#0D1B3E', marginBottom: '.5rem' }}>Check your inbox</h1>
          <p style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: '1.7', marginBottom: '1.5rem' }}>
            We've sent you a verification email. Click the link inside to activate your account and continue to Novation.
          </p>

          <div style={{ background: '#F8F7F4', borderRadius: '8px', padding: '12px 16px', fontSize: '12px', color: '#6B7280', lineHeight: '1.6' }}>
            Didn't get it? Check your spam folder, or contact us at{' '}
            <a href="mailto:hello@klarum.ca" style={{ color: '#3B82F6', textDecoration: 'none' }}>hello@klarum.ca</a>
          </div>
        </div>
      </div>
    </main>
  )
}