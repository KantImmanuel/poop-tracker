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

      {/* ── Example Report Cards ── */}
      <section className="landing-section">
        <h2 className="landing-section-title">What your report looks like</h2>
        <div className="landing-report-cards">
          {/* Summary */}
          <div className="landing-insight-card">
            <p className="landing-insight-eyebrow">Summary</p>
            <p className="landing-insight-summary" style={{ marginBottom: 0 }}>
              Dairy and garlic show the strongest correlation with your symptoms.
              Meals containing cream or yogurt were followed by issues 75% of the time.
            </p>
          </div>

          {/* Potential Triggers */}
          <div className="landing-insight-card">
            <p className="landing-insight-eyebrow">Potential Triggers</p>
            <div className="landing-insight-row">
              <span className="landing-insight-label">Dairy</span>
              <span className="landing-insight-badge landing-insight-badge--red">82% likely</span>
            </div>
            <p className="landing-insight-reason">Present in 6 of 8 meals before symptoms</p>
            <div className="landing-insight-row">
              <span className="landing-insight-label">Garlic</span>
              <span className="landing-insight-badge landing-insight-badge--yellow">65% likely</span>
            </div>
            <p className="landing-insight-reason">Eaten 10 times, suspect in 6 cases</p>
            <div className="landing-insight-row">
              <span className="landing-insight-label">Wheat / Gluten</span>
              <span className="landing-insight-badge landing-insight-badge--green">48% likely</span>
            </div>
            <p className="landing-insight-reason">May be coincidental with dairy</p>
          </div>

          {/* Safe Foods */}
          <div className="landing-insight-card">
            <p className="landing-insight-eyebrow">Safe Foods</p>
            <div className="landing-insight-safe">
              <span className="landing-insight-safe-icon">&#10003;</span>
              <span><strong>Rice</strong> — eaten 7 times with no issues</span>
            </div>
            <div className="landing-insight-safe">
              <span className="landing-insight-safe-icon">&#10003;</span>
              <span><strong>Chicken</strong> — eaten 5 times, only 1 mild episode</span>
            </div>
            <div className="landing-insight-safe">
              <span className="landing-insight-safe-icon">&#10003;</span>
              <span><strong>Oat milk</strong> — dairy substitute with no issues</span>
            </div>
          </div>

          {/* Timing */}
          <div className="landing-insight-card">
            <p className="landing-insight-eyebrow">Timing</p>
            <p className="landing-insight-summary" style={{ marginBottom: 0 }}>
              Most symptoms appear 8–14 hours after eating trigger foods.
              Garlic-heavy meals tend to cause issues slightly faster (6–10 hours).
            </p>
          </div>

          {/* Next Steps */}
          <div className="landing-insight-card">
            <p className="landing-insight-eyebrow">Next Steps</p>
            <ul className="landing-insight-steps">
              <li>Try eliminating dairy for 2 weeks and note any changes</li>
              <li>When eating garlic, avoid combining with dairy</li>
              <li>Keep logging — 2 more weeks of data will improve accuracy</li>
            </ul>
          </div>

          <p className="landing-insight-disclaimer" style={{ textAlign: 'center' }}>
            Based on your logged data — not medical advice.
          </p>
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
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/contact">Contact</Link>
        </div>
        <p className="landing-footer-brand">Gut Feeling</p>
      </footer>
    </div>
  );
}

export default Landing;
