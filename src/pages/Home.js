import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { offlinePost } from '../services/api';
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
      await offlinePost('/poops', {
        severity: selectedSeverity,
        symptoms: selectedSymptoms.length > 0 ? selectedSymptoms : undefined
      });
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

      <div className="page-header" style={{ textAlign: 'center' }}>
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

              {selectedSeverity && (
                <>
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
                    disabled={loading}
                  >
                    {loading ? 'Logging...' : 'Log It'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
