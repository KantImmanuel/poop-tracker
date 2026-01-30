import { Link } from 'react-router-dom';

function Terms() {
  return (
    <div className="page" style={{ paddingBottom: '40px' }}>
      <div className="page-header">
        <Link to="/" className="landing-link" style={{ fontSize: '14px' }}>&larr; Back</Link>
        <h1 className="page-title" style={{ fontSize: '32px', marginTop: '8px' }}>Terms of Service</h1>
        <p className="text-muted" style={{ marginTop: '4px' }}>Last updated: January 2026</p>
      </div>

      <div className="container">
        <div className="card" style={{ background: 'white', border: '1px solid #E8D9C8' }}>
          <h3 style={{ margin: '0 0 8px', color: '#4A2E1F' }}>Acceptance</h3>
          <p style={{ color: '#7A5A44', lineHeight: 1.6, margin: '0 0 20px' }}>
            By creating an account or using Gut Feeling, you agree to these terms. If you don't agree, please don't use the service.
          </p>

          <h3 style={{ margin: '0 0 8px', color: '#4A2E1F' }}>What the service does</h3>
          <p style={{ color: '#7A5A44', lineHeight: 1.6, margin: '0 0 20px' }}>
            Gut Feeling lets you log meals (via photo or manual entry) and bowel movements, then uses AI to identify potential food triggers. The service is provided as-is for personal tracking purposes.
          </p>

          <h3 style={{ margin: '0 0 8px', color: '#4A2E1F' }}>Not medical advice</h3>
          <p style={{ color: '#7A5A44', lineHeight: 1.6, margin: '0 0 20px' }}>
            Gut Feeling is not a medical application. AI-generated insights are pattern-based suggestions, not diagnoses. Do not use this app as a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of a qualified healthcare provider with any questions regarding a medical condition.
          </p>

          <h3 style={{ margin: '0 0 8px', color: '#4A2E1F' }}>Your account</h3>
          <p style={{ color: '#7A5A44', lineHeight: 1.6, margin: '0 0 20px' }}>
            You are responsible for keeping your login credentials secure. You must provide a valid email address. We reserve the right to suspend accounts that violate these terms.
          </p>

          <h3 style={{ margin: '0 0 8px', color: '#4A2E1F' }}>Your content</h3>
          <p style={{ color: '#7A5A44', lineHeight: 1.6, margin: '0 0 20px' }}>
            You own the photos and data you upload. By using the service, you grant us permission to process your content through AI providers for the purpose of delivering the service. We do not claim ownership of your data.
          </p>

          <h3 style={{ margin: '0 0 8px', color: '#4A2E1F' }}>Acceptable use</h3>
          <p style={{ color: '#7A5A44', lineHeight: 1.6, margin: '0 0 20px' }}>
            Use Gut Feeling for its intended purpose — personal food and symptom tracking. Don't upload content that is illegal, harmful, or unrelated to food tracking. Don't attempt to reverse-engineer, abuse, or overload the service.
          </p>

          <h3 style={{ margin: '0 0 8px', color: '#4A2E1F' }}>Limitation of liability</h3>
          <p style={{ color: '#7A5A44', lineHeight: 1.6, margin: '0 0 20px' }}>
            Gut Feeling is provided "as is" without warranties of any kind. We are not liable for any health decisions made based on AI-generated insights. Use the information at your own risk.
          </p>

          <h3 style={{ margin: '0 0 8px', color: '#4A2E1F' }}>Changes</h3>
          <p style={{ color: '#7A5A44', lineHeight: 1.6, margin: '0 0 20px' }}>
            We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the new terms.
          </p>

          <h3 style={{ margin: '0 0 8px', color: '#4A2E1F' }}>Contact</h3>
          <p style={{ color: '#7A5A44', lineHeight: 1.6, margin: 0 }}>
            Questions? Reach us at{' '}
            <a href="mailto:pooptracker2001@protonmail.com" className="landing-link">
              pooptracker2001@protonmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Terms;
