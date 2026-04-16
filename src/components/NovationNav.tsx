'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useRef, useState } from 'react'

export default function NovationNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function fetchUnread() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { count: rootUnread } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('to_id', user.id)
        .is('parent_id', null)
        .is('read_at', null)

      const { count: replyUnread } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('to_id', user.id)
        .not('parent_id', 'is', null)
        .is('read_at', null)

      setUnreadCount((rootUnread ?? 0) + (replyUnread ?? 0))
    }
    fetchUnread()
  }, [pathname])

  // Close settings dropdown on outside click
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

  return (
    <nav className="nov-nav">
      <Link href="/profile" className="nov-logo">
        <div className="nov-logo-parent">
          <svg width="28" height="19" viewBox="0 0 44 30" fill="none">
            <rect x="1" y="1" width="3.5" height="28" fill="#0D1B3E" />
            <path d="M4.5 15 L18 1" stroke="#0D1B3E" strokeWidth="3" strokeLinecap="square" />
            <path d="M4.5 15 L18 29" stroke="#0D1B3E" strokeWidth="3" strokeLinecap="square" />
            <line x1="18" y1="4" x2="34" y2="15" stroke="#0D1B3E" strokeWidth="0.75" opacity="0.35" />
            <line x1="18" y1="26" x2="34" y2="15" stroke="#0D1B3E" strokeWidth="0.75" opacity="0.35" />
            <circle cx="34" cy="15" r="7" fill="#3B82F6" />
          </svg>
          <span className="nov-logo-wordmark">klarum</span>
        </div>
        <div className="nov-logo-product-row">
          <div className="nov-logo-rule" />
          <span className="nov-logo-product">Novation</span>
        </div>
      </Link>

      <div className="nov-nav-links">
        <Link href="/dashboard" className={`nov-nav-link ${pathname === '/dashboard' ? 'active' : ''}`}>
          Dashboard
        </Link>
        <Link href="/profile" className={`nov-nav-link ${pathname.startsWith('/profile') ? 'active' : ''}`}>
          My Profile
        </Link>
        <Link href="/marketplace" className={`nov-nav-link ${pathname.startsWith('/marketplace') ? 'active' : ''}`}>
          Marketplace
        </Link>
        <Link href="/inbox" className={`nov-nav-link ${pathname === '/inbox' || pathname.startsWith('/inbox/') ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          Messages
          {unreadCount > 0 && (
            <span style={{
              background: '#3B82F6', color: 'white',
              fontSize: '10px', fontWeight: 700, borderRadius: '100px',
              padding: '1px 6px', lineHeight: '16px',
            }}>
              {unreadCount}
            </span>
          )}
        </Link>
        <Link href="/deals" className={`nov-nav-link ${pathname.startsWith('/deals') ? 'active' : ''}`}>
          Deals
        </Link>

        {/* Settings */}
        <div ref={settingsRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <button
            onClick={() => setSettingsOpen(o => !o)}
            className="nov-nav-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: settingsOpen ? '#0D1B3E' : undefined }}
            aria-label="Settings"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M7.47 1.26a1.75 1.75 0 0 1 3.06 0l.3.52a1.75 1.75 0 0 0 2.39.64l.52-.3a1.75 1.75 0 0 1 2.17 2.6l-.36.44a1.75 1.75 0 0 0 0 2.68l.36.44a1.75 1.75 0 0 1-2.17 2.6l-.52-.3a1.75 1.75 0 0 0-2.39.64l-.3.52a1.75 1.75 0 0 1-3.06 0l-.3-.52a1.75 1.75 0 0 0-2.39-.64l-.52.3a1.75 1.75 0 0 1-2.17-2.6l.36-.44a1.75 1.75 0 0 0 0-2.68l-.36-.44A1.75 1.75 0 0 1 4.26 2.08l.52.3a1.75 1.75 0 0 0 2.39-.64l.3-.52ZM9 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
                fill="currentColor"
                opacity="0.7"
              />
            </svg>
          </button>

          {settingsOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              background: 'white',
              border: '1px solid #E2E6F0',
              borderRadius: '10px',
              boxShadow: '0 4px 16px rgba(13,27,62,0.08)',
              minWidth: '148px',
              zIndex: 100,
              overflow: 'hidden',
            }}>
              <button
                onClick={handleSignOut}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '11px 16px',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 400,
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
