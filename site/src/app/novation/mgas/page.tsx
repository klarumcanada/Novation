'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

function CheckIcon() {
  return (
    <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="var(--electric)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default function MGAsPage() {
  const fadeRefs = useRef<(HTMLElement | null)[]>([])
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, message: 'MGA demo request' }),
    })
    setSubmitted(true)
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
          <li><Link href="/novation/advisors">Advisors</Link></li>
          <li><Link href="/novation/mgas" className="active">MGAs</Link></li>
          <li><a href="#get-started" className="nav-cta">Request a demo</a></li>
        </ul>
      </nav>

      <section className="hero">
        <div className="novation-lockup">
          <span className="novation-lockup-line" />
          <span className="novation-lockup-text">Novation</span>
        </div>
        <h1>
          Support your advisors.<br />
          <span className="accent">Keep the business.</span>
        </h1>
        <p className="hero-sub">
          When an advisor retires or a new one is looking to grow, your MGA is the most important player in the room. Novation gives you the tools to make that count — and keep every transition inside your ecosystem.
        </p>
        <div>
          <a href="#get-started" className="btn-primary">Request a demo →</a>
        </div>
      </section>

      {/* THE OPPORTUNITY */}
      <section className="section section-chalk">
        <div className="section-inner">
          <div className="section-label">The opportunity</div>
          <h2 className="section-title">Every transition is a chance<br />to strengthen your book.</h2>
          <p className="section-body">
            Advisor succession isn&apos;t just a risk to manage — it&apos;s one of the biggest growth opportunities an MGA has. The MGAs who get there first keep the business. The ones who don&apos;t, lose it to someone else.
          </p>
          <div className="card-grid fade-in" ref={addRef}>
            <div className="nov-card">
              <div className="nov-card-step">01</div>
              <div className="nov-card-title">Retiring advisors need more than a seminar</div>
              <p className="nov-card-body">You can&apos;t support a retiring advisor with advice alone. Novation gives them a real marketplace, a real valuation, and a structured path out — all within your MGA.</p>
            </div>
            <div className="nov-card">
              <div className="nov-card-step">02</div>
              <div className="nov-card-title">Growing advisors need real opportunity</div>
              <p className="nov-card-body">New and growing advisors want to build their books faster. Give them access to acquisition opportunities inside your network — vetted, structured, and MGA-coordinated.</p>
            </div>
            <div className="nov-card">
              <div className="nov-card-step">03</div>
              <div className="nov-card-title">You keep everything in your ecosystem</div>
              <p className="nov-card-body">When succession happens through Novation, it happens through you. The business stays in your network, the relationships stay intact, and you stay in control.</p>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section className="section">
        <div className="section-inner">
          <div className="two-col">
            <div className="fade-in" ref={addRef}>
              <div className="section-label">What you get</div>
              <h2 className="section-title">You&apos;re in control.<br />From day one to deal done.</h2>
              <p style={{ fontSize: '16px', color: 'var(--gray-500)', lineHeight: 1.7, fontWeight: 300 }}>
                Novation is configured for your MGA. You decide who gets access, who can list, and how involved you want to be at each stage. The tools are simple, the workflow is yours.
              </p>
              <ul className="check-list">
                <li><CheckIcon />You control who registers — advisors join through your MGA, not a public signup</li>
                <li><CheckIcon />You vet listings before they go live — nothing moves without your approval</li>
                <li><CheckIcon />You can participate in the deal at any stage — as observer, coordinator, or closer</li>
                <li><CheckIcon />Configurable pipeline stages to match how your MGA actually works</li>
                <li><CheckIcon />All documentation, consent, and transfer tracking in one place</li>
                <li><CheckIcon />Every deal stays inside your ecosystem — no leakage to outside networks</li>
              </ul>
            </div>
            <div className="panel fade-in" ref={addRef}>
              <div className="panel-header">
                <div className="panel-title">MGA Portal</div>
                <div className="panel-badge">Early access</div>
              </div>
              <div className="panel-label">Active successions</div>
              <div className="panel-card">
                <div className="panel-card-top">
                  <div className="panel-card-name">David M. · Ontario</div>
                  <div className="panel-card-tag tag-selling">Selling</div>
                </div>
                <div className="panel-card-detail">28 yrs · $4.2M book · Life &amp; living benefits · 18-month timeline</div>
              </div>
              <div className="panel-card">
                <div className="panel-card-top">
                  <div className="panel-card-name">Robert T. · Alberta</div>
                  <div className="panel-card-tag tag-selling">Selling</div>
                </div>
                <div className="panel-card-detail">34 yrs · $6.8M book · Full-service · 12-month timeline</div>
              </div>
              <div className="panel-card">
                <div className="panel-card-top">
                  <div className="panel-card-name">Sarah K. · BC</div>
                  <div className="panel-card-tag tag-buying">Buying</div>
                </div>
                <div className="panel-card-detail">6 yrs · Wealth focus · Seeking established relationships</div>
              </div>
              <div className="pipeline-stages">
                <div className="pipeline-stage done" />
                <div className="pipeline-stage done" />
                <div className="pipeline-stage done" />
                <div className="pipeline-stage active" />
                <div className="pipeline-stage" />
                <div className="pipeline-stage" />
                <div className="pipeline-stage" />
                <div className="pipeline-stage" />
              </div>
              <div className="pipeline-label">David M. · Stage 4 of 8 · LOI in review</div>
              <p className="panel-disclaimer">Illustrative only — not a depiction of actual system data or functionality.</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section section-chalk">
        <div className="section-inner">
          <div className="section-label">How it works</div>
          <h2 className="section-title">Simple tools. Handled.<br />Your way.</h2>
          <div className="card-grid fade-in" ref={addRef}>
            <div className="nov-card">
              <div className="nov-card-step">01</div>
              <div className="nov-card-title">You invite advisors in</div>
              <p className="nov-card-body">Advisors join Novation through your MGA — not a public platform. You control who registers, who can list, and who can browse. It&apos;s your network, and it stays that way.</p>
            </div>
            <div className="nov-card">
              <div className="nov-card-step">02</div>
              <div className="nov-card-title">You set the rules, they get the tools</div>
              <p className="nov-card-body">Once advisors are in, Novation handles the heavy lifting — valuations, messaging, LOIs, due diligence. You stay involved at whatever level makes sense for your MGA.</p>
            </div>
            <div className="nov-card">
              <div className="nov-card-step">03</div>
              <div className="nov-card-title">The business stays with you</div>
              <p className="nov-card-body">Every deal closes inside your ecosystem. Client relationships transfer cleanly, carriers are notified properly, and your MGA comes out stronger — not just intact.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section" id="get-started">
        <h2 className="cta-title fade-in" ref={addRef}>
          Ready to make advisor<br />succession <em>work for you?</em>
        </h2>
        <p className="cta-sub fade-in" ref={addRef}>
          See how Novation fits your MGA — your workflow, your rules, your ecosystem. No commitment required.
        </p>
        {submitted ? (
          <p className="cta-thanks fade-in" ref={addRef}>We&apos;ll be in touch within 2 business days.</p>
        ) : (
          <form className="cta-form fade-in" ref={addRef} onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="your@mga.ca"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary">Request a demo</button>
          </form>
        )}
        <p className="cta-note">Canadian MGAs only · We&apos;ll be in touch within 2 business days</p>
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
          <li><Link href="/novation/advisors">Advisors</Link></li>
          <li><a href="mailto:hello@klarum.ca">Contact</a></li>
        </ul>
        <span className="footer-copy">© 2026 Klarum Inc.</span>
      </footer>
    </>
  )
}
