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

      <div className="page-header">
        <h1 className="page-title">IBS Tracker</h1>
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

      <div className="container" style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingBottom: '80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
          <label
            htmlFor="home-photo-input"
            className="btn btn-primary"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              gap: '12px',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '64px' }}>📷</span>
            Log Meal
          </label>

          {!showSeverityPicker ? (
            <button
              className="btn btn-secondary"
              onClick={() => setShowSeverityPicker(true)}
              disabled={loading}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                gap: '12px'
              }}
            >
              <span style={{ fontSize: '64px' }}>💩</span>
              {loading ? 'Logging...' : 'Log Poop'}
            </button>
          ) : (
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px' }}>
              <p style={{ margin: '0 0 24px 0', fontWeight: '500', textAlign: 'center', fontSize: '20px' }}>How was it?</p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '24px 12px', fontSize: '16px' }}
                  onClick={() => handleLogPoop('mild')}
                >
                  😊<br />Mild
                </button>
                <button
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '24px 12px', fontSize: '16px' }}
                  onClick={() => handleLogPoop('moderate')}
                >
                  😐<br />Moderate
                </button>
                <button
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '24px 12px', fontSize: '16px' }}
                  onClick={() => handleLogPoop('severe')}
                >
                  😣<br />Severe
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
