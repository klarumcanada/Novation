import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Register — Novation by Klarum",
};

export default function NovationRegisterPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0D1B3E',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '32px' }}>
        <svg width="38" height="26" viewBox="0 0 44 30" fill="none">
          <rect x="1" y="1" width="3.5" height="28" fill="white" />
          <path d="M4.5 15 L18 1" stroke="white" strokeWidth="3" strokeLinecap="square" />
          <path d="M4.5 15 L18 29" stroke="white" strokeWidth="3" strokeLinecap="square" />
          <line x1="18" y1="4" x2="34" y2="15" stroke="white" strokeWidth="0.75" opacity="0.4" />
          <line x1="18" y1="26" x2="34" y2="15" stroke="white" strokeWidth="0.75" opacity="0.4" />
          <circle cx="34" cy="15" r="7" fill="#3B82F6" />
        </svg>
        <span style={{
          fontFamily: 'var(--font-serif), Georgia, serif',
          fontSize: '22px',
          fontWeight: 600,
          color: 'white',
          letterSpacing: '-0.02em',
        }}>
          klarum
        </span>
      </Link>

      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: '#fff',
        borderRadius: '16px',
        padding: '40px 48px',
      }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#94A3B8',
          fontFamily: 'var(--font-sans), DM Sans, sans-serif',
          marginBottom: '10px',
        }}>
          Novation
        </div>
        <h1 style={{
          fontFamily: 'var(--font-serif), Georgia, serif',
          fontSize: '26px',
          fontWeight: 600,
          color: '#0D1B3E',
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          marginBottom: '12px',
        }}>
          Get access
        </h1>
        <p style={{
          fontSize: '14px',
          fontWeight: 300,
          fontFamily: 'var(--font-sans), DM Sans, sans-serif',
          color: '#64748B',
          lineHeight: 1.65,
          marginBottom: '28px',
        }}>
          Novation is currently invite-only. Contact us to request access for your MGA or advisory practice.
        </p>
        <a
          href="mailto:hello@klarum.ca?subject=Novation access request"
          style={{
            display: 'block',
            width: '100%',
            padding: '13px',
            fontSize: '15px',
            fontWeight: 500,
            fontFamily: 'var(--font-sans), DM Sans, sans-serif',
            borderRadius: '8px',
            border: 'none',
            background: '#3B82F6',
            color: '#fff',
            cursor: 'pointer',
            textAlign: 'center',
            textDecoration: 'none',
            boxSizing: 'border-box',
          }}
        >
          Request access
        </a>
        <p style={{
          marginTop: '20px',
          textAlign: 'center',
          fontSize: '13px',
          fontFamily: 'var(--font-sans), DM Sans, sans-serif',
          color: '#94A3B8',
        }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#3B82F6', textDecoration: 'none', fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
