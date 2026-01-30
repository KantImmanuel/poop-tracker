import { Link } from 'react-router-dom';

function Landing() {
  return (
    <div className="landing-page">
      {/* ── Hero ── */}
      <section className="landing-hero">
        <span className="landing-hero-emoji">🍽️💩</span>
        <h1 className="landing-hero-title">
          Find your food triggers.<br />
          <span className="landing-hero-accent">Without spreadsheets.</span>
        </h1>
        <p className="landing-hero-sub">
          Snap meals, log symptoms, and let AI find the patterns you'd never spot on your own.
        </p>
        <Link to="/register" className="btn btn-primary landing-cta">
          Start Logging
        </Link>
        <p className="landing-hero-signin">
          Already have an account?{' '}
          <Link to="/login" className="landing-link">Sign in</Link>
        </p>
      </section>

      {/* ── How It Works ── */}
      <section className="landing-section">
        <h2 className="landing-section-title">How it works</h2>
        <div className="landing-steps">
          <div className="landing-step">
            <span className="landing-step-num">1</span>
            <span className="landing-step-icon">📸</span>
            <h3>Snap your meals</h3>
            <p>Take a photo and AI extracts every food and ingredient.</p>
          </div>
          <div className="landing-step">
            <span className="landing-step-num">2</span>
            <span className="landing-step-icon">💩</span>
            <h3>Log your poops</h3>
            <p>One tap. Pick a severity. Done in under 2 seconds.</p>
          </div>
          <div className="landing-step">
            <span className="landing-step-num">3</span>
            <span className="landing-step-icon">📊</span>
            <h3>Get AI insights</h3>
            <p>We crunch the data and surface your likely trigger foods.</p>
          </div>
        </div>
      </section>

      {/* ── Screenshots ── */}
      <section className="landing-section">
        <h2 className="landing-section-title">See it in action</h2>
        <div className="landing-screenshots">
          <div className="landing-screenshot-frame">
            <img src="/mockups/home.png" alt="Home screen with log meal and log poop buttons" />
          </div>
          <div className="landing-screenshot-frame">
            <img src="/mockups/food-logged.png" alt="Food logged confirmation with AI-detected ingredients" />
          </div>
          <div className="landing-screenshot-frame">
            <img src="/mockups/insights.png" alt="Insights screen showing potential trigger foods" />
          </div>
        </div>
      </section>

      {/* ── Example Insight ── */}
      <section className="landing-section">
        <div className="landing-insight-card">
          <p className="landing-insight-eyebrow">Example insight</p>
          <h3 className="landing-insight-title">Garlic might be a culprit</h3>
          <div className="landing-insight-bar">
            <div className="landing-insight-fill" style={{ width: '65%' }} />
          </div>
          <div className="landing-insight-meta">
            <span className="landing-insight-badge">65% likely</span>
            <span className="landing-insight-disclaimer">Based on your logged data — not medical advice.</span>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="landing-section landing-bottom-cta">
        <h2 className="landing-section-title">Ready to find your triggers?</h2>
        <p className="landing-hero-sub">Free to use. Takes 30 seconds to start.</p>
        <Link to="/register" className="btn btn-primary landing-cta">
          Start Logging
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-footer-links">
          <a href="#privacy">Privacy</a>
          <a href="#terms">Terms</a>
          <a href="#contact">Contact</a>
        </div>
        <p className="landing-footer-brand">Gut Feeling</p>
      </footer>
    </div>
  );
}

export default Landing;
