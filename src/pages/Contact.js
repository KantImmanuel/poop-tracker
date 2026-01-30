import { Link } from 'react-router-dom';

function Contact() {
  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', minHeight: '100vh' }}>
      <div className="container">
        <div className="text-center mb-3">
          <h1 className="page-title" style={{ fontSize: '32px' }}>Get in Touch</h1>
          <p className="text-muted">We'd love to hear from you</p>
        </div>

        <div className="card" style={{ background: 'white', border: '1px solid #E8D9C8', textAlign: 'center' }}>
          <p style={{ color: '#7A5A44', lineHeight: 1.6, margin: '0 0 20px' }}>
            Have a question, found a bug, or just want to say hi? Drop us an email and we'll get back to you.
          </p>

          <a
            href="mailto:pooptracker2001@protonmail.com"
            className="btn btn-primary"
            style={{ textDecoration: 'none', maxWidth: '320px', margin: '0 auto' }}
          >
            Send us an Email
          </a>

          <p style={{ color: '#7A5A44', fontSize: '14px', marginTop: '16px', marginBottom: 0 }}>
            pooptracker2001@protonmail.com
          </p>
        </div>

        <p className="text-center mt-2">
          <Link to="/" className="landing-link">&larr; Back to home</Link>
        </p>
      </div>
    </div>
  );
}

export default Contact;
