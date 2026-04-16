'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useRef, useState } from 'react'

interface MgaNavProps {
  mgaSlug: string
  userEmail: string
}

export default function MgaNav({ mgaSlug, userEmail }: MgaNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false)
      }
    }
    if (settingsOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [settingsOpen])

  async function handleSignOut() {
    setSettingsOpen(false)
    await supabase.auth.signOut()
    router.push('/login')
  }

  const base = `/mga/${mgaSlug}`

  const links = [
    { href: base,               label: 'Dashboard', active: pathname === base },
    { href: `${base}/advisors`, label: 'Advisors',  active: pathname.startsWith(`${base}/advisors`) },
    { href: `${base}/deals`,    label: 'Deals',     active: pathname.startsWith(`${base}/deals`) },
  ]

  return (
    <nav className="mga-nav">
      <div className="mga-nav-left">
        <Link href={base} className="mga-logo">
          <div className="mga-logo-parent">
            <svg width="24" height="16" viewBox="0 0 44 30" fill="none">
              <rect x="1" y="1" width="3.5" height="28" fill="white" opacity="0.6" />
              <path d="M4.5 15 L18 1" stroke="white" strokeWidth="3" strokeLinecap="square" opacity="0.6" />
              <path d="M4.5 15 L18 29" stroke="white" strokeWidth="3" strokeLinecap="square" opacity="0.6" />
              <line x1="18" y1="4" x2="34" y2="15" stroke="white" strokeWidth="0.75" opacity="0.2" />
              <line x1="18" y1="26" x2="34" y2="15" stroke="white" strokeWidth="0.75" opacity="0.2" />
              <circle cx="34" cy="15" r="7" fill="#3B82F6" />
            </svg>
            <span className="mga-logo-wordmark">klarum</span>
          </div>
          <div className="mga-logo-product-row">
            <div className="mga-logo-rule" />
            <span className="mga-logo-product">Novation</span>
          </div>
        </Link>
      </div>

      <div className="mga-nav-right" style={{ gap: 4 }}>
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="mga-nav-link"
            style={{
              color: link.active ? 'white' : 'rgba(255,255,255,0.6)',
              fontWeight: link.active ? 500 : 400,
              background: 'transparent',
            }}
          >
            {link.label}
          </Link>
        ))}

        {/* Settings cog */}
        <div ref={settingsRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', marginLeft: 8 }}>
          <button
            onClick={() => setSettingsOpen(o => !o)}
            className="mga-nav-link"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '5px 7px', display: 'flex', alignItems: 'center',
              color: settingsOpen ? 'white' : 'rgba(255,255,255,0.6)',
            }}
            aria-label="Settings"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {settingsOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 10px)',
              right: 0,
              background: 'white',
              border: '1px solid #E2E6F0',
              borderRadius: 10,
              boxShadow: '0 4px 16px rgba(13,27,62,0.12)',
              minWidth: 200,
              zIndex: 100,
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '11px 16px',
                fontFamily: 'DM Sans, sans-serif', fontSize: 12,
                color: '#9CA3AF',
                borderBottom: '1px solid #F3F4F6',
              }}>
                {userEmail}
              </div>
              <button
                onClick={handleSignOut}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '11px 16px',
                  fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 400,
                  color: '#0D1B3E', background: 'none', border: 'none',
                  cursor: 'pointer',
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
