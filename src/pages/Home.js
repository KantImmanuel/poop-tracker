import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { offlinePost } from '../services/api';

function Home() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSeverityPicker, setShowSeverityPicker] = useState(false);

  const handlePhotoCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Navigate to log-meal with the captured image
      navigate('/log-meal', { state: { capturedImage: file } });
    }
    // Reset input so same file can be selected again
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

      <div className="page-header" style={{ textAlign: 'left', maxWidth: '480px', margin: '0 auto', padding: '32px 16px 16px' }}>
        <h1 className="page-title" style={{ fontSize: '32px' }}>How's your gut today?</h1>
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
          <label
            htmlFor="home-photo-input"
            className="btn btn-primary"
            style={{
              padding: '18px 28px',
              fontSize: '20px',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '24px' }}>📷</span>
            Capture Food
          </label>

          {!showSeverityPicker ? (
            <button
              className="btn btn-secondary"
              onClick={() => setShowSeverityPicker(true)}
              disabled={loading}
              style={{
                padding: '18px 28px',
                fontSize: '20px'
              }}
            >
              <span style={{ fontSize: '24px' }}>💩</span>
              {loading ? 'Logging...' : 'Log Poop'}
            </button>
          ) : (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px' }}>
              <p style={{ margin: '0 0 20px 0', fontWeight: '700', textAlign: 'center', fontSize: '20px', color: '#3D3229' }}>How was it?</p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '18px 12px', fontSize: '15px', flexDirection: 'column', gap: '6px' }}
                  onClick={() => handleLogPoop('mild')}
                >
                  <span style={{ fontSize: '28px' }}>😊</span>
                  Easy
                </button>
                <button
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '18px 12px', fontSize: '15px', flexDirection: 'column', gap: '6px' }}
                  onClick={() => handleLogPoop('moderate')}
                >
                  <span style={{ fontSize: '28px' }}>😐</span>
                  Meh
                </button>
                <button
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '18px 12px', fontSize: '15px', flexDirection: 'column', gap: '6px' }}
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
