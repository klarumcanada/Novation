import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Agora — Coming Soon | Klarum",
  description: "Agora by Klarum. Coming soon.",
};

export default function AgoraPage() {
  return (
    <>
      <nav className="nav">
        <Link href="/" className="nav-logo">
          <svg width="38" height="26" viewBox="0 0 44 30" fill="none">
            <rect x="1" y="1" width="3.5" height="28" fill="#0D1B3E" />
            <path d="M4.5 15 L18 1" stroke="#0D1B3E" strokeWidth="3" strokeLinecap="square" />
            <path d="M4.5 15 L18 29" stroke="#0D1B3E" strokeWidth="3" strokeLinecap="square" />
            <line x1="18" y1="4" x2="34" y2="15" stroke="#0D1B3E" strokeWidth="0.75" opacity="0.35" />
            <line x1="18" y1="26" x2="34" y2="15" stroke="#0D1B3E" strokeWidth="0.75" opacity="0.35" />
            <circle cx="34" cy="15" r="7" fill="#3B82F6" />
          </svg>
          <span className="nav-logo-text">klarum</span>
        </Link>
        <ul className="nav-links">
          <li className="nav-dropdown">
            <span className="nav-dropdown-trigger">
              Products
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
                <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <ul className="nav-dropdown-menu">
              <div className="nav-dropdown-menu-inner">
                <div className="nav-dropdown-section-label">Novation</div>
                <li><Link href="/novation/mgas">For MGAs</Link></li>
                <li><Link href="/novation/advisors">For Advisors</Link></li>
                <div className="nav-dropdown-divider" />
                <li><Link href="/agora" className="active">Agora</Link></li>
              </div>
            </ul>
          </li>
          <li><Link href="/#contact">Contact</Link></li>
        </ul>
      </nav>

      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "120px 48px 80px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--gray-500)",
            marginBottom: "16px",
          }}
        >
          Coming soon
        </div>
        <h1
          style={{
            fontFamily: "var(--serif)",
            fontSize: "clamp(2.5rem, 6vw, 4rem)",
            fontWeight: 700,
            color: "var(--midnight)",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            marginBottom: "20px",
          }}
        >
          Agora
        </h1>
        <p
          style={{
            fontSize: "1.125rem",
            color: "var(--gray-500)",
            maxWidth: "480px",
            lineHeight: 1.6,
          }}
        >
          Something new is on the way. Stay tuned.
        </p>
      </main>
    </>
  );
}
