"use client";

import { useEffect, useRef, useState } from "react";

export default function Home() {
  const fadeRefs = useRef<(HTMLElement | null)[]>([]);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

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
    if (!email) return;
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) setSubmitted(true);
    } catch (err) {
      console.error("Submission error:", err);
    }
  };

  return (
    <>
      {/* NAV */}
      <nav className="nav">
        <a href="#" className="nav-logo">
          <svg width="38" height="26" viewBox="0 0 44 30" fill="none">
            <rect x="1" y="1" width="3.5" height="28" fill="#0D1B3E"/>
            <path d="M4.5 15 L18 1" stroke="#0D1B3E" stroke-width="3" stroke-linecap="square"/>
            <path d="M4.5 15 L18 29" stroke="#0D1B3E" stroke-width="3" stroke-linecap="square"/>
            <line x1="18" y1="4" x2="34" y2="15" stroke="#0D1B3E" stroke-width="0.75" opacity="0.35"/>
            <line x1="18" y1="26" x2="34" y2="15" stroke="#0D1B3E" stroke-width="0.75" opacity="0.35"/>
            <circle cx="34" cy="15" r="7" fill="#3B82F6"/>
          </svg>
          <span className="nav-logo-text">klarum</span>
        </a>
        <ul className="nav-links">
          <li><a href="#about">About</a></li>
          <li><a href="#novation">Novation</a></li>
          <li><a href="#contact">Contact</a></li>
          <li><a href="/login" className="nav-cta">Login</a></li>
        </ul>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-eyebrow">Built for Canadian insurance</div>
        <h1>
          We handle the tech.<br />
          <span className="text-electric">You handle</span><br />
          the business.
        </h1>
        <p className="hero-sub">
          Klarum builds tools that MGAs and advisors need — so you can stay focused on clients and growth.
        </p>
        <div className="hero-actions">
          <a href="#novation" className="btn-primary">See Novation →</a>
          <button className="btn-ghost" onClick={() => scrollTo("about")}>
            Learn more <span className="arrow">→</span>
          </button>
        </div>
        <div className="hero-scroll">
          <span className="scroll-line" />
          Scroll
        </div>
      </section>

      {/* WHAT IS KLARUM */}
      <section className="about-section" id="about">
        <div className="about-grid">
          <div ref={addRef} className="fade-in">
            <div className="section-label">What is Klarum</div>
            <h2 className="section-title">
              Technology built for the way this industry actually works.
            </h2>
            <p className="section-body">
              The Canadian life insurance industry runs on relationships. But the infrastructure underneath — succession, compliance, advisor data — hasn&apos;t kept up.
            </p>
          </div>
          <div ref={addRef} className="pillars fade-in">
            <div className="pillar">
              <div className="pillar-title">Purpose-built for MGAs</div>
              <p className="pillar-body">
                We understand the MGA model — AGAs, compliance requirements, advisor relationships — and build tools that fit the workflow, not against it.
              </p>
            </div>
            <div className="pillar">
              <div className="pillar-title">Canadian-first</div>
              <p className="pillar-body">
                PIPEDA-compliant infrastructure, hosted in Canada. Built specifically for the regulatory environment your business operates in.
              </p>
            </div>
            <div className="pillar">
              <div className="pillar-title">Advisor-facing by design</div>
              <p className="pillar-body">
                Tools that advisors actually want to use — reducing friction at every touchpoint and making complex processes feel simple.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* NOVATION */}
      <section id="novation" className="novation-outer">
        <div className="novation-section">
          <div ref={addRef} className="novation-header fade-in">
            <div>
              <div className="product-badge">Flagship product — coming soon</div>
              <div className="section-label">Novation</div>
              <h2 className="section-title">
                Book-of-business succession,<br />done right.
              </h2>
              <p className="section-body">
                Novation is the first purpose-built marketplace for Canadian advisor succession. Sellers find qualified buyers. MGAs protect their books. Everyone moves forward with confidence.
              </p>
            </div>
          </div>
          <div ref={addRef} className="novation-cards fade-in">
            <div className="nov-card">
              <div className="nov-card-num">01</div>
              <div className="nov-card-title">List or discover</div>
              <p className="nov-card-body">
                Advisors register their book or search for acquisition opportunities — with the detail and context to make informed decisions.
              </p>
            </div>
            <div className="nov-card">
              <div className="nov-card-num">02</div>
              <div className="nov-card-title">Match with confidence</div>
              <p className="nov-card-body">
                Structured matching based on book profile, geography, and MGA alignment. No cold outreach. No guesswork.
              </p>
            </div>
            <div className="nov-card">
              <div className="nov-card-num">03</div>
              <div className="nov-card-title">Transition smoothly</div>
              <p className="nov-card-body">
                Built-in tools for handover documentation, client communication, and MGA coordination — keeping all parties aligned.
              </p>
            </div>
          </div>
          <div ref={addRef} className="novation-cta-row fade-in">
            <a href="#contact" className="btn-primary">Get more information</a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section" id="contact">
        <h2 ref={addRef} className="cta-title fade-in">
          Ready to see how<br />we can <span className="text-electric">help?</span>
        </h2>
        <p ref={addRef} className="cta-sub fade-in">
          Get more information about our first product — Novation — and what&apos;s coming next.
        </p>
        {submitted ? (
          <p ref={addRef} className="cta-thanks fade-in">
            Thanks — we&apos;ll be in touch.
          </p>
        ) : (
          <form ref={addRef} className="cta-form fade-in" onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary">Get more information</button>
          </form>
        )}
      </section>

      {/* FOOTER */}
      <footer>
        <span className="footer-logo">Klarum</span>
        <ul className="footer-links">
          <li><a href="#novation">Novation</a></li>
          <li><a href="#contact">Contact</a></li>
          <li><a href="#">Privacy</a></li>
        </ul>
        <span className="footer-copy">© 2026 Klarum Inc.</span>
      </footer>
    </>
  );
}