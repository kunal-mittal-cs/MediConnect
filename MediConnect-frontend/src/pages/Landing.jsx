import React from 'react';

import Logo from '../components/Logo';

export default function Landing({
  onLogin,
  onRegister,
}) {
  return (
    <div className="landing">

      {/* Navigation */}
      <header className="landing-nav">

        <div className="landing-nav-logo">
          <Logo />
        </div>

        <nav className="landing-nav-actions">
          <button
            type="button"
            className="text-btn landing-login-btn"
            onClick={onLogin}
          >
            Log in
          </button>

          <button
            type="button"
            className="primary-btn landing-register-btn"
            onClick={onRegister}
          >
            Get started
          </button>
        </nav>

      </header>

      {/* Hero */}
      <main className="hero">

        <div className="hero-copy">

          <span className="eyebrow">
            HEALTHCARE, REIMAGINED
          </span>

          <h1>
            Care that starts with{' '}
            <em>clarity.</em>
          </h1>

          <p>
            MediConnect helps you find the right
            medical specialty, connect with verified
            doctors and manage remote consultations
            in one place.
          </p>

          <div className="hero-actions">

            <button
              type="button"
              className="primary-btn large"
              onClick={onRegister}
            >
              Start for free →
            </button>

            <button
              type="button"
              className="ghost-btn large"
              onClick={onLogin}
            >
              I already have an account
            </button>

          </div>

          <div className="trust-row">

            <span>
              ✓ Verified professionals
            </span>

            <span>
              ✓ Secure records
            </span>

            <span>
              ✓ AI-assisted navigation
            </span>

          </div>

        </div>

        {/* Visual preview */}
        <div className="hero-art">

          <div
            className="orb"
            aria-hidden="true"
          />

          <div className="floating-card ai-float">

            <span aria-hidden="true">
              ✦
            </span>

            <div>
              <b>AI Health Assistant</b>

              <small>
                Find the right specialty
              </small>
            </div>

          </div>

          <div className="floating-card doctor-float">

            <div
              className="avatar"
              aria-hidden="true"
            >
              DS
            </div>

            <div>
              <b>Dr. Sharma</b>

              <small>
                Dermatology · Available
              </small>
            </div>

            <i aria-label="Verified">
              ✓
            </i>

          </div>

          <div className="hero-panel">

            <div
              className="pulse"
              aria-hidden="true"
            >
              +
            </div>

            <b>Connected care</b>

            <small>
              From first question to consultation
            </small>

          </div>

        </div>

      </main>

      {/* Product benefits */}
      <section className="landing-features">

        <div>
          <b>01</b>

          <h3>
            Know where to start
          </h3>

          <p>
            Describe your concern and get general
            specialty guidance without a diagnosis.
          </p>
        </div>

        <div>
          <b>02</b>

          <h3>
            Choose your doctor
          </h3>

          <p>
            Compare verified professionals, services,
            availability and pricing.
          </p>
        </div>

        <div>
          <b>03</b>

          <h3>
            Stay connected
          </h3>

          <p>
            Chat, share documents and manage your
            consultation history securely.
          </p>
        </div>

      </section>

      <footer>
        MediConnect · Remote healthcare marketplace ·
        For navigation, not diagnosis
      </footer>

    </div>
  );
}