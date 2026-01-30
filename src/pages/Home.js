import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { offlinePost } from '../services/api';

function IconBadge({ children }) {
  return <span className="btn-icon-badge">{children}</span>;
}

function CameraIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
      <path d="M12 15.2c1.76 0 3.2-1.44 3.2-3.2S13.76 8.8 12 8.8 8.8 10.24 8.8 12s1.44 3.2 3.2 3.2zm7-10.2h-2.59l-1.65-1.8c-.37-.4-.89-.6-1.42-.6h-2.68c-.53 0-1.05.2-1.42.6L7.59 5H5c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-7 12c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
    </svg>
  );
}

function PoopIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
      <ellipse cx="12" cy="17.5" rx="6.5" ry="3" />
      <ellipse cx="12" cy="13" rx="5" ry="2.8" />
      <ellipse cx="12.5" cy="9" rx="3.5" ry="2.2" />
      <ellipse cx="13" cy="6" rx="2" ry="1.8" />
    </svg>
  );
}

function Home() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSeverityPicker, setShowSeverityPicker] = useState(false);

  const handlePhotoCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      navigate('/log-meal', { state: { capturedImage: file } });
    }
    e.target.value = '';
  };

  const handleLogPoop = async (selectedSeverity) => {
    setLoading(true);
    setShowSeverityPicker(false);
    try {
      await offlinePost('/poops', { severity: selectedSeverity });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to log poop:', error);
      alert('Failed to log. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      {showSuccess && <div className="success-flash">Logged!</div>}

      <div className="page-header">
        <h1 className="page-title" style={{ fontSize: '32px' }}>
          How's your gut today?
        </h1>
      </div>

      <input
        type="file"
        id="home-photo-input"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoCapture}
        ref={fileInputRef}
        style={{ display: 'none' }}
      />

      <div className="container" style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', paddingBottom: '80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label htmlFor="home-photo-input" className="btn btn-primary">
            <IconBadge><CameraIcon /></IconBadge>
            Capture Food
          </label>

          {!showSeverityPicker ? (
            <button
              className="btn btn-secondary"
              onClick={() => setShowSeverityPicker(true)}
              disabled={loading}
            >
              <IconBadge><PoopIcon /></IconBadge>
              {loading ? 'Logging...' : 'Log Poop'}
            </button>
          ) : (
            <div className="card" style={{ padding: '24px' }}>
              <p style={{ margin: '0 0 20px 0', fontWeight: '700', textAlign: 'center', fontSize: '20px', color: '#4A2E1F' }}>
                How was it?
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  className="btn btn-outline"
                  style={{ flex: 1, flexDirection: 'column', gap: '6px' }}
                  onClick={() => handleLogPoop('mild')}
                >
                  <span style={{ fontSize: '28px' }}>😊</span>
                  Easy
                </button>
                <button
                  className="btn btn-outline"
                  style={{ flex: 1, flexDirection: 'column', gap: '6px' }}
                  onClick={() => handleLogPoop('moderate')}
                >
                  <span style={{ fontSize: '28px' }}>😐</span>
                  Meh
                </button>
                <button
                  className="btn btn-outline"
                  style={{ flex: 1, flexDirection: 'column', gap: '6px' }}
                  onClick={() => handleLogPoop('severe')}
                >
                  <span style={{ fontSize: '28px' }}>😣</span>
                  Uh-oh
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
