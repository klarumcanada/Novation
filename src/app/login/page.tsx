"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "token">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Auth logic goes here
  };

  const handleToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (token) router.push(`/register?token=${token}`);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <a href="/" className="login-logo">
          <svg width="38" height="26" viewBox="0 0 44 30" fill="none">
            <rect x="1" y="1" width="3.5" height="28" fill="#0D1B3E"/>
            <path d="M4.5 15 L18 1" stroke="#0D1B3E" stroke-width="3" stroke-linecap="square"/>
            <path d="M4.5 15 L18 29" stroke="#0D1B3E" stroke-width="3" stroke-linecap="square"/>
            <line x1="18" y1="4" x2="34" y2="15" stroke="#0D1B3E" stroke-width="0.75" opacity="0.35"/>
            <line x1="18" y1="26" x2="34" y2="15" stroke="#0D1B3E" stroke-width="0.75" opacity="0.35"/>
            <circle cx="34" cy="15" r="7" fill="#3B82F6"/>
          </svg>
          <span className="login-logo-text">klarum</span>
        </a>

        <div className="login-tabs">
          <button
            className={`login-tab${mode === "login" ? " active" : ""}`}
            onClick={() => setMode("login")}
          >
            Sign in
          </button>
          <button
            className={`login-tab${mode === "token" ? " active" : ""}`}
            onClick={() => setMode("token")}
          >
            Invitation code
          </button>
        </div>

        {mode === "login" ? (
          <form className="login-form" onSubmit={handleLogin}>
            <div className="login-field">
              <label className="login-label">Email</label>
              <input
                type="email"
                className="login-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="login-field">
              <label className="login-label">Password</label>
              <input
                type="password"
                className="login-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="login-btn">Sign in to Novation</button>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleToken}>
            <p className="login-hint">
              Enter the invitation code from your welcome email to create your Novation account.
            </p>
            <div className="login-field">
              <label className="login-label">Invitation code</label>
              <input
                type="text"
                className="login-input login-input--mono"
                placeholder="XXXX-XXXX-XXXX"
                value={token}
                onChange={(e) => setToken(e.target.value.toUpperCase())}
                required
              />
            </div>
            <button type="submit" className="login-btn">Continue</button>
          </form>
        )}
      </div>
    </div>
  );
}