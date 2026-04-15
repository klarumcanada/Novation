'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'

export default function NovationNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function fetchUnread() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Unread root messages
      const { count: rootUnread } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('to_id', user.id)
        .is('parent_id', null)
        .is('read_at', null)

      // Unread replies sent to me
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

  async function handleSignOut() {
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
        <Link href="/marketplace" className={`nov-nav-link ${pathname.startsWith('/marketplace') ? 'active' : ''}`}>
          Marketplace
        </Link>
        <Link href="/inbox" className={`nov-nav-link ${pathname === '/inbox' || pathname.startsWith('/inbox/') ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          Inbox
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
        <Link href="/profile" className={`nov-nav-link ${pathname.startsWith('/profile') ? 'active' : ''}`}>
          Profile
        </Link>
        <Link href="/deals" className={`nov-nav-link ${pathname.startsWith('/deals') ? 'active' : ''}`}>
          Deals
        </Link>
        <button onClick={handleSignOut} className="nov-nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          Sign out
        </button>
      </div>
    </nav>
  )
}