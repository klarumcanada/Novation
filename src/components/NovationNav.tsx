'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function NovationNav() {
  const pathname = usePathname()

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
        <Link href="/marketplace" className={`nov-nav-link ${pathname.startsWith('/marketplace') ? 'active' : ''}`}>
          Marketplace
        </Link>
        <Link href="/inbox" className={`nov-nav-link ${pathname === '/inbox' ? 'active' : ''}`}>
          Inbox
        </Link>
        <Link href="/profile" className={`nov-nav-link ${pathname.startsWith('/profile') ? 'active' : ''}`}>
          My Profile
        </Link>
      </div>
    </nav>
  )
}