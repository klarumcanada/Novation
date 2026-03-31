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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSubmitted(true);
  };

  return (
    <>
      {/* NAV */}
      <nav className="nav">
        <a href="#" className="nav-logo">Klarum</a>
        <ul className="nav-links">
          <li><a href="#about">About</a></li>
          <li><a href="#novation">Novation</a></li>
          <li><a href="#team">Who we are</a></li>
          <li><a href="/login" className="nav-cta">Login</a></li>
        </ul>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-eyebrow">Built for Canadian insurance</div>
        <h1>
          We handle the tech.<br />
          <em>You handle</em><br />
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

      {/* WHO WE ARE */}
      <section className="team-section" id="team">
        <div className="team-inner">
          <div ref={addRef} className="fade-in">
            <div className="section-label">Who we are</div>
            <h2 className="section-title" style={{ maxWidth: 600 }}>
              Industry insiders who got tired of waiting for someone else to build this.
            </h2>
          </div>
          <div className="team-grid">
            {[
              {
                initials: "KV",
                name: "Kelsi Van Kruistum",
                role: "",
                bio: "Director at Zinnia, VP at APEXA — deep understanding of the Canadian independent distribution landscape and expertise in the intersection of unique life insurance advisor/MGA workflows and technology.",
              },
              {
                initials: "+",
                name: "We're building.",
                role: "Open roles",
                bio: "Deep domain experience in Canadian insurance distribution, with a product or technical background? We'd like to hear from you.",
                muted: true,
              },
            ].map((person) => (
              <div
                key={person.name}
                ref={addRef}
                className={`team-card fade-in${person.muted ? " team-card--muted" : ""}`}
              >
                <div className={`team-initial${person.muted ? " team-initial--muted" : ""}`}>
                  {person.initials}
                </div>
                <div className={`team-name${person.muted ? " team-name--muted" : ""}`}>
                  {person.name}
                </div>
                <div className="team-role">{person.role}</div>
                <p className={`team-bio${person.muted ? " team-bio--muted" : ""}`}>
                  {person.bio}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section" id="contact">
        <h2 ref={addRef} className="cta-title fade-in">
          Ready to see how<br />we can <em>help?</em>
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