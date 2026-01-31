import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { offlinePost } from '../services/api';
import { saveGuestPoop } from '../services/guestStorage';
import cameraIcon from '../assets/camera-icon.png';
import poopIcon from '../assets/poop-icon.png';

const SYMPTOM_OPTIONS = [
  { val: 'bloating', emoji: '🫧', label: 'Bloating' },
  { val: 'cramps', emoji: '🤕', label: 'Cramps' },
  { val: 'gas', emoji: '💨', label: 'Gas' },
  { val: 'nausea', emoji: '🤢', label: 'Nausea' },
  { val: 'urgency', emoji: '🏃', label: 'Urgency' },
  { val: 'fatigue', emoji: '😴', label: 'Fatigue' },
];

function Home() {
  const navigate = useNavigate();
  const { isGuest } = useAuth();
  const fileInputRef = useRef(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSeverityPicker, setShowSeverityPicker] = useState(false);
  const [selectedSeverity, setSelectedSeverity] = useState(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);

  const toggleSymptom = (symptom) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptom)
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    );
  };

  const handlePhotoCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      navigate('/log-meal', { state: { capturedImage: file } });
    }
    e.target.value = '';
  };

  const handleSeverityPick = (sev) => {
    setSelectedSeverity(sev);
  };

  const handleLogPoop = async () => {
    setLoading(true);
    setShowSeverityPicker(false);
    try {
      if (isGuest) {
        await saveGuestPoop(selectedSeverity, selectedSymptoms.length > 0 ? selectedSymptoms : undefined);
      } else {
        await offlinePost('/poops', {
          severity: selectedSeverity,
          symptoms: selectedSymptoms.length > 0 ? selectedSymptoms : undefined
        });
      }
      setShowSuccess(true);
      setSelectedSeverity(null);
      setSelectedSymptoms([]);
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

      <div className="page-header" style={{ textAlign: 'center', position: 'relative' }}>
        <button
          onClick={() => navigate('/settings')}
          style={{
            position: 'absolute',
            top: '24px',
            right: '0',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 8px',
            lineHeight: 1
          }}
          aria-label="Settings"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4A2E1F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.45 }}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <h1 className="page-title">
          How's your gut<br />today?
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
            <img src={cameraIcon} alt="" style={{ width: '60px', height: '60px', objectFit: 'contain', flexShrink: 0 }} />
            Capture Food
          </label>

          {!showSeverityPicker ? (
            <button
              className="btn btn-secondary"
              onClick={() => setShowSeverityPicker(true)}
              disabled={loading}
            >
              <img src={poopIcon} alt="" style={{ width: '60px', height: '60px', objectFit: 'contain', flexShrink: 0 }} />
              {loading ? 'Logging...' : 'Log Poop'}
            </button>
          ) : (
            <div className="card" style={{ padding: '24px' }}>
              <p style={{ margin: '0 0 20px 0', fontWeight: '700', textAlign: 'center', fontSize: '20px', color: '#4A2E1F' }}>
                How was it?
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                {[
                  { val: 'mild', emoji: '😊', label: 'Easy' },
                  { val: 'moderate', emoji: '😐', label: 'Meh' },
                  { val: 'severe', emoji: '😣', label: 'Uh-oh' }
                ].map(s => (
                  <button
                    key={s.val}
                    className={`btn btn-outline${selectedSeverity === s.val ? ' btn-outline-active' : ''}`}
                    style={{ flex: 1, flexDirection: 'column', gap: '6px' }}
                    onClick={() => handleSeverityPick(s.val)}
                  >
                    <span style={{ fontSize: '28px' }}>{s.emoji}</span>
                    {s.label}
                  </button>
                ))}
              </div>

              <p style={{ margin: '20px 0 12px 0', fontWeight: '600', textAlign: 'center', fontSize: '15px', color: '#7A5A44' }}>
                Any symptoms?
              </p>
              <div className="symptom-chips">
                {SYMPTOM_OPTIONS.map(s => (
                  <button
                    key={s.val}
                    className={`symptom-chip${selectedSymptoms.includes(s.val) ? ' active' : ''}`}
                    onClick={() => toggleSymptom(s.val)}
                  >
                    <span>{s.emoji}</span> {s.label}
                  </button>
                ))}
              </div>
              <button
                className="btn btn-primary"
                style={{ marginTop: '16px', height: '52px', fontSize: '18px', borderRadius: '16px' }}
                onClick={handleLogPoop}
                disabled={loading || !selectedSeverity}
              >
                {loading ? 'Logging...' : 'Log It'}
              </button>
            </div>
          )}
        </div>

          {isGuest && (
            <button
              onClick={() => navigate('/register')}
              style={{
                marginTop: '32px',
                background: 'none',
                border: 'none',
                color: '#7E8B47',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                padding: 0,
                fontFamily: 'inherit',
                textAlign: 'center',
                width: '100%'
              }}
            >
              Create a free account to back up your data
            </button>
          )}
      </div>
    </div>
  );
}

export default Home;
