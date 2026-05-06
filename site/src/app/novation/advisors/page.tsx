'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'

function CheckIcon() {
  return (
    <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="var(--electric)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default function AdvisorsPage() {
  const fadeRefs = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.1 }
    )
    fadeRefs.current.forEach(el => el && obs.observe(el))
    return () => obs.disconnect()
  }, [])

  const addRef = (el: HTMLElement | null) => {
    if (el && !fadeRefs.current.includes(el)) fadeRefs.current.push(el)
  }

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
          <li><Link href="/novation/advisors" className="active">Advisors</Link></li>
          <li><Link href="/novation/mgas">For MGAs</Link></li>
          <li><Link href="/login" className="nav-cta">Get started</Link></li>
        </ul>
      </nav>

      <section className="hero">
        <div className="novation-lockup">
          <span className="novation-lockup-line" />
          <span className="novation-lockup-text">Novation</span>
        </div>
        <h1>
          Your practice.<br />
          Your future.<br />
          <span className="accent">Your terms.</span>
        </h1>
        <p className="hero-sub">
          Whether you&apos;re building your book or planning your exit, Novation gives you the tools and the market to do it right — through your MGA.
        </p>
        <div className="hero-tabs-wrap">
          <div className="hero-tabs">
            <a href="#establish" className="hero-tab active">Establishing yourself</a>
            <a href="#exit" className="hero-tab">Planning your exit</a>
          </div>
        </div>
      </section>

      {/* ESTABLISH */}
      <section className="section section-chalk" id="establish">
        <div className="section-inner">
          <div className="two-col">
            <div className="fade-in" ref={addRef}>
              <div className="product-badge">For buyers</div>
              <h2 className="section-title">Looking to establish yourself in the Canadian industry?</h2>
              <p className="section-body">
                Acquiring an existing book is one of the fastest ways to build a practice with real clients, real revenue, and an established referral base. Novation connects you with retiring advisors who are ready to hand off.
              </p>
              <ul className="check-list">
                <li><CheckIcon />Browse listings from retiring advisors across Canada</li>
                <li><CheckIcon />Filter by location, book size, and practice type</li>
                <li><CheckIcon />Connect through secure, structured messaging</li>
                <li><CheckIcon />Guided deal process — valuation, LOI, due diligence</li>
                <li><CheckIcon />MGA-coordinated handoff so clients transition smoothly</li>
              </ul>
            </div>
            <div className="panel fade-in" ref={addRef}>
              <div className="panel-header">
                <div className="panel-title">Advisor marketplace</div>
                <div className="panel-badge">Live listings</div>
              </div>
              <div className="panel-label">Matches in your area</div>
              <div className="panel-card">
                <div className="panel-card-top">
                  <div className="panel-card-name">David M. · Ontario</div>
                  <div className="panel-card-tag tag-match">Strong match</div>
                </div>
                <div className="panel-card-detail">28 yrs · $4.2M book · Life &amp; living benefits · 18-month timeline</div>
              </div>
              <div className="panel-card">
                <div className="panel-card-top">
                  <div className="panel-card-name">Robert T. · Alberta</div>
                  <div className="panel-card-tag tag-new">New listing</div>
                </div>
                <div className="panel-card-detail">34 yrs · $6.8M book · Full-service · 12-month timeline</div>
              </div>
              <div className="panel-card">
                <div className="panel-card-top">
                  <div className="panel-card-name">Marie L. · Quebec</div>
                  <div className="panel-card-tag tag-match">Strong match</div>
                </div>
                <div className="panel-card-detail">22 yrs · $2.9M book · Group benefits · 24-month timeline</div>
              </div>
              <p className="panel-disclaimer">Illustrative only — not a depiction of actual system data or functionality.</p>
            </div>
          </div>
        </div>
      </section>

      {/* EXIT */}
      <section className="section" id="exit">
        <div className="section-inner">
          <div className="two-col">
            <div className="fade-in" ref={addRef}>
              <div className="product-badge">For sellers</div>
              <h2 className="section-title">Plan your transition on your own terms.</h2>
              <p className="section-body">
                You&apos;ve spent years building your practice. Novation helps you exit with confidence — connecting you with qualified buyers, giving you a clear picture of your book&apos;s value, and keeping your clients in good hands.
              </p>
              <ul className="check-list">
                <li><CheckIcon />List your book and set your own timeline</li>
                <li><CheckIcon />Three-path book valuation — tool, manual entry, or PDF upload</li>
                <li><CheckIcon />Review interest from qualified buyers in your network</li>
                <li><CheckIcon />Structured deal process — nothing improvised, nothing missed</li>
                <li><CheckIcon />Client consent and communication managed through the platform</li>
              </ul>
            </div>
            <div className="panel fade-in" ref={addRef}>
              <div className="panel-header">
                <div className="panel-title">Interested buyers</div>
                <div className="panel-badge">Your listing</div>
              </div>
              <div className="panel-label">Buyers who expressed interest</div>
              <div className="panel-card">
                <div className="panel-card-top">
                  <div className="panel-card-name">Sarah K. · BC</div>
                  <div className="panel-card-tag tag-buying">Buying</div>
                </div>
                <div className="panel-card-detail">6 yrs in practice · Wealth focus · Seeking established client relationships</div>
              </div>
              <div className="panel-card">
                <div className="panel-card-top">
                  <div className="panel-card-name">James T. · Ontario</div>
                  <div className="panel-card-tag tag-buying">Buying</div>
                </div>
                <div className="panel-card-detail">4 yrs in practice · Life &amp; living benefits · Looking to grow quickly</div>
              </div>
              <div className="panel-card">
                <div className="panel-card-top">
                  <div className="panel-card-name">Priya N. · Alberta</div>
                  <div className="panel-card-tag tag-buying">Buying</div>
                </div>
                <div className="panel-card-detail">8 yrs in practice · Full-service · Flexible on timeline</div>
              </div>
              <p className="panel-disclaimer">Illustrative only — not a depiction of actual system data or functionality.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section" id="get-started">
        <h2 className="cta-title fade-in" ref={addRef}>
          Novation is available<br />through your <em>MGA.</em>
        </h2>
        <p className="cta-sub fade-in" ref={addRef}>
          Novation is deployed through MGAs across Canada. Ask your MGA about it — advisor demand is how MGAs get started.
        </p>
        <div style={{ position: 'relative', zIndex: 1 }} className="fade-in" ref={addRef}>
          <Link href="/novation/mgas" className="btn-primary">Share this with your MGA →</Link>
          <p className="cta-note" style={{ marginTop: '16px' }}>Already have access? Log in through your MGA&apos;s portal.</p>
        </div>
      </section>

      <footer>
        <Link href="/" className="footer-logo">
          <svg width="28" height="19" viewBox="0 0 44 30" fill="none">
            <rect x="1" y="1" width="3.5" height="28" fill="#0D1B3E" />
            <path d="M4.5 15 L18 1" stroke="#0D1B3E" strokeWidth="3" strokeLinecap="square" />
            <path d="M4.5 15 L18 29" stroke="#0D1B3E" strokeWidth="3" strokeLinecap="square" />
            <line x1="18" y1="4" x2="34" y2="15" stroke="#0D1B3E" strokeWidth="0.75" opacity="0.35" />
            <line x1="18" y1="26" x2="34" y2="15" stroke="#0D1B3E" strokeWidth="0.75" opacity="0.35" />
            <circle cx="34" cy="15" r="7" fill="#3B82F6" />
          </svg>
          {' '}klarum
        </Link>
        <ul className="footer-links">
          <li><Link href="/novation/mgas">For MGAs</Link></li>
          <li><a href="mailto:hello@klarum.ca">Contact</a></li>
        </ul>
        <span className="footer-copy">© 2026 Klarum Inc.</span>
      </footer>
    </>
  )
}
