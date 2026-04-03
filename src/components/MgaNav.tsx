'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

interface MgaNavProps {
  mgaName: string
  mgaSlug: string
  userEmail: string
}

export default function MgaNav({ mgaName, mgaSlug, userEmail }: MgaNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const base = `/mga/${mgaSlug}`

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

        <div className="mga-nav-divider" />
        <span className="mga-nav-name">{mgaName}</span>

        <div className="mga-nav-links">
          <Link
            href={base}
            className={`mga-nav-link ${pathname === base ? 'active' : ''}`}
          >
            Dashboard
          </Link>
          <Link
            href={`${base}/advisors`}
            className={`mga-nav-link ${pathname.startsWith(`${base}/advisors`) ? 'active' : ''}`}
          >
            Advisors
          </Link>
          <Link
            href={`${base}/team`}
            className={`mga-nav-link ${pathname.startsWith(`${base}/team`) ? 'active' : ''}`}
          >
            Team
          </Link>
        </div>
      </div>

      <div className="mga-nav-right">
        <span className="mga-nav-user">{userEmail}</span>
        <button onClick={handleSignOut} className="mga-nav-signout">
          Sign out
        </button>
      </div>
    </nav>
  )
}