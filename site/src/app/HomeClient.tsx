"use client";

import { useEffect, useRef, useState } from "react";

const AGORA_MARK = (
  <svg width="26" height="26" viewBox="0 0 100 100" aria-hidden="true">
    <path d="M33 44 C33 20 67 20 67 44" fill="none" stroke="#0D1B3E" strokeWidth="7" />
    <path d="M20 44 H80 L70 84 H30 Z" fill="none" stroke="#0D1B3E" strokeWidth="7" strokeLinejoin="round" />
    <circle cx="70" cy="74" r="19" fill="oklch(80% 0.28 145)" />
    <text x="70" y="82" fontFamily="'DM Sans', sans-serif" fontWeight="700" fontSize="24" fill="#0D1B3E" textAnchor="middle">A</text>
  </svg>
);

const QUICK_FILL_MESSAGE = "I'd like to learn more";

export default function Home() {
  const fadeRefs = useRef<(HTMLElement | null)[]>([]);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("visible");
        });
      },
      { threshold: 0.12 }
    );
    fadeRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const addRef = (el: HTMLElement | null) => {
    if (el && !fadeRefs.current.includes(el)) fadeRefs.current.push(el);
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, company, email, message }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Could not reach the server. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* NAV — Agora-led lockup, single link out to Klarum, no peer-level Products menu */}
      <nav className="nav">
        <a href="#" className="nav-lockup">
          <div className="nav-lockup-row">
            {AGORA_MARK}
            <span className="agora-logo-text">agora</span>
          </div>
          <span className="nav-product-label">A Klarum Product</span>
        </a>
        <ul className="nav-links">
          <li><button className="nav-link-btn" onClick={() => scrollTo("how-it-works")}>How it works</button></li>
          <li><a href="/agora/marketplace">Browse listings</a></li>
          <li><button className="nav-link-btn" onClick={() => scrollTo("backed-by-klarum")}>About Klarum</button></li>
        </ul>
        <a href="/agora/register" className="btn-agora-primary nav-cta-btn">List your business →</a>
      </nav>

      {/* HERO — Agora is the headline, Klarum is the credential */}
      <section className="hero agora-hero">
        <div className="hero-eyebrow">Agora · A Klarum Product</div>
        <h1>The marketplace for advisor transitions.</h1>
        <p className="hero-sub">
          Agora connects advisors ready to sell their book with qualified buyers ready to grow theirs — with the diligence tools to make both sides confident in the deal.
        </p>
        <div className="hero-actions">
          <a href="/agora/register" className="btn-agora-primary">List your business →</a>
          <a href="/agora/marketplace" className="btn-agora-outline">Browse listings</a>
        </div>
        <div className="hero-scroll">
          <span className="scroll-line" />
          Scroll
        </div>
      </section>

      {/* WHAT AGORA IS */}
      <section className="about-section" id="what-agora-is">
        <div className="about-grid">
          <div ref={addRef} className="fade-in">
            <div className="section-label section-label--meadow">What Agora Is</div>
            <p className="pull-quote">
              &ldquo;The marketplace where advisors buy and sell business — built by the technical partner they already trust.&rdquo;
            </p>
            <p className="section-body">
              Agora doesn&apos;t just list books of business — it connects the right buyer to the right seller, with the tools to move a deal from interest to close. It&apos;s a Klarum product: same discipline, same quiet confidence, applied to the moment an advisor&apos;s career changes hands.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — placeholder, needs real product detail from Kelsi */}
      <section className="howitworks-outer" id="how-it-works">
        <div className="howitworks-section">
          <div ref={addRef} className="howitworks-header fade-in">
            <div className="todo-flag">TODO — confirm with Kelsi</div>
            <div className="section-label section-label--meadow">How It Works</div>
            <h2 className="section-title">From listing to close.</h2>
            <p className="section-body">
              Placeholder structure below — replace with the real steps of listing, matching, and closing a deal on Agora, plus any diligence tools it provides.
            </p>
          </div>
          <div ref={addRef} className="howitworks-cards fade-in">
            <div className="nov-card">
              <div className="nov-card-num">Step 01</div>
              <div className="nov-card-title">TODO</div>
              <p className="nov-card-body">Awaiting real copy from Kelsi.</p>
            </div>
            <div className="nov-card">
              <div className="nov-card-num">Step 02</div>
              <div className="nov-card-title">TODO</div>
              <p className="nov-card-body">Awaiting real copy from Kelsi.</p>
            </div>
            <div className="nov-card">
              <div className="nov-card-num">Step 03</div>
              <div className="nov-card-title">TODO</div>
              <p className="nov-card-body">Awaiting real copy from Kelsi.</p>
            </div>
            <div className="nov-card">
              <div className="nov-card-num">Step 04</div>
              <div className="nov-card-title">TODO</div>
              <p className="nov-card-body">Awaiting real copy from Kelsi.</p>
            </div>
          </div>
        </div>
      </section>

      {/* BACKED BY KLARUM — secondary story, accent switches to Electric */}
      <section className="klarum-outer" id="backed-by-klarum">
        <div className="klarum-section">
          <div ref={addRef} className="klarum-lockup fade-in">
            <span className="klarum-lockup-text">klarum<span className="klarum-lockup-full-stop">.</span></span>
          </div>
          <div ref={addRef} className="fade-in">
            <div className="section-label">Backed by Klarum</div>
            <p className="klarum-pull-quote">
              &ldquo;The technical partner that handles the backend complexity of insurance — so MGAs and advisors can focus entirely on selling.&rdquo;
            </p>
            <p className="klarum-body">
              Klarum is the technical partner for Canadian MGAs and advisors — we handle the tech so you can handle the business.
            </p>
            <button className="btn-electric-outline" onClick={() => scrollTo("contact")}>
              Learn more about Klarum →
            </button>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="cta-section" id="contact">
        <h2 ref={addRef} className="cta-title fade-in">Ready to see how we can help?</h2>
        <p ref={addRef} className="cta-sub fade-in">
          Get more information about Agora and what&apos;s coming next.
        </p>
        {submitted ? (
          <p ref={addRef} className="cta-thanks agora-contact-thanks fade-in">
            Thanks — we&apos;ll be in touch.
          </p>
        ) : (
          <form ref={addRef} className="cta-form agora-contact-form fade-in" onSubmit={handleSubmit}>
            <div>
              <label className="cta-form-label" htmlFor="contact-name">Name</label>
              <input
                id="contact-name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="cta-form-label" htmlFor="contact-company">
                Company <span className="cta-form-optional">(optional)</span>
              </label>
              <input
                id="contact-company"
                type="text"
                placeholder="Company (optional)"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <div>
              <label className="cta-form-label" htmlFor="contact-email">Email</label>
              <input
                id="contact-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="cta-form-label" htmlFor="contact-message">Message</label>
              <button
                type="button"
                className="cta-quickfill"
                onClick={() => setMessage(QUICK_FILL_MESSAGE)}
              >
                {QUICK_FILL_MESSAGE}
              </button>
              <textarea
                id="contact-message"
                placeholder="How can we help?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>
            {error && (
              <p style={{ fontSize: "13px", color: "#dc2626", fontFamily: "var(--sans)" }}>{error}</p>
            )}
            <button type="submit" className="btn-agora-primary cta-form-submit" disabled={submitting}>
              {submitting ? "Sending…" : "Get more information"}
            </button>
          </form>
        )}
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-brand">
          <span className="footer-logo">klarum<span className="full-stop">.</span></span>
          <span className="footer-tagline">Agora is a product of Klarum.</span>
        </div>
        <ul className="footer-links">
          <li><button className="nav-link-btn footer-link-btn" onClick={() => scrollTo("how-it-works")}>How it works</button></li>
          <li><a href="/agora/marketplace">Browse listings</a></li>
          {/* Quiet footer-only mention per guardrail ("footer/product-family mention at most") — /novation/mgas, /novation/advisors, and /novation/register are real, still-functional pages that had nav links before this redesign; confirm with Kelsi (open question #4) whether even this should stay while paused */}
          <li><a href="/novation/mgas">Novation</a></li>
          <li><button className="nav-link-btn footer-link-btn" onClick={() => scrollTo("backed-by-klarum")}>About Klarum</button></li>
          <li><button className="nav-link-btn footer-link-btn" onClick={() => scrollTo("contact")}>Contact</button></li>
          <li><a href="#">Privacy</a></li>
        </ul>
        <span className="footer-copy">© 2026 Klarum Inc.</span>
      </footer>
    </>
  );
}
