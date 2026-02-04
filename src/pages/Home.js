import { useState } from 'react';
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
  { val: 'blood', emoji: '🩸', label: 'Blood' },
  { val: 'mucus', emoji: '💧', label: 'Mucus' },
];

const BRISTOL_TYPES = [
  { val: '1', label: 'Hard lumps' },
  { val: '2', label: 'Lumpy' },
  { val: '3', label: 'Cracked' },
  { val: '4', label: 'Smooth' },
  { val: '5', label: 'Soft blobs' },
  { val: '6', label: 'Mushy' },
  { val: '7', label: 'Liquid' },
];

const BRISTOL_ICONS = {
  '1': (
    <svg width="28" height="20" viewBox="0 0 28 20">
      <circle cx="6" cy="6" r="3" fill="#8B7355"/>
      <circle cx="15" cy="5" r="3.5" fill="#8B7355"/>
      <circle cx="24" cy="7" r="3" fill="#8B7355"/>
      <circle cx="10" cy="15" r="3" fill="#8B7355"/>
      <circle cx="20" cy="15" r="3.5" fill="#8B7355"/>
    </svg>
  ),
  '2': (
    <svg width="28" height="20" viewBox="0 0 28 20">
      <ellipse cx="14" cy="10" rx="12" ry="6" fill="#8B7355"/>
      <circle cx="7" cy="7" r="2.5" fill="#7A6345"/>
      <circle cx="14" cy="6" r="2.5" fill="#7A6345"/>
      <circle cx="21" cy="7" r="2.5" fill="#7A6345"/>
    </svg>
  ),
  '3': (
    <svg width="28" height="20" viewBox="0 0 28 20">
      <rect x="2" y="5" width="24" height="10" rx="5" fill="#8B7355"/>
      <line x1="9" y1="6" x2="9" y2="10" stroke="#6B5340" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="14" y1="6" x2="14" y2="9" stroke="#6B5340" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="19" y1="6" x2="19" y2="10" stroke="#6B5340" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  '4': (
    <svg width="28" height="20" viewBox="0 0 28 20">
      <rect x="2" y="6" width="24" height="8" rx="4" fill="#8B7355"/>
    </svg>
  ),
  '5': (
    <svg width="28" height="20" viewBox="0 0 28 20">
      <ellipse cx="7" cy="9" rx="5" ry="4" fill="#8B7355"/>
      <ellipse cx="20" cy="8" rx="6" ry="4.5" fill="#8B7355"/>
      <ellipse cx="13" cy="16" rx="5" ry="3" fill="#8B7355"/>
    </svg>
  ),
  '6': (
    <svg width="28" height="20" viewBox="0 0 28 20">
      <path d="M3 12c0-3 2-6 5-7 2-1 4 0 6 0s4-1 6 0c3 1 5 4 5 7s-3 5-11 5-11-2-11-5z" fill="#8B7355" opacity="0.85"/>
    </svg>
  ),
  '7': (
    <svg width="28" height="20" viewBox="0 0 28 20">
      <path d="M7 7c1.5-4 3-6 4-6s2 3 2.5 6c.8 4.5-1 8-3.5 8S5.5 11.5 7 7z" fill="#C4A24C" opacity="0.75"/>
      <path d="M18 5c1-3 2.5-4.5 3.5-4.5s1.5 2 2 4.5c.8 3.5-.5 7-2.5 7S17 8.5 18 5z" fill="#C4A24C" opacity="0.75"/>
    </svg>
  ),
};

function Home() {
  const navigate = useNavigate();
  const { isGuest } = useAuth();
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

      <div className="container" style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', paddingBottom: '80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button className="btn btn-primary" onClick={() => navigate('/log-meal')}>
            <img src={cameraIcon} alt="" style={{ width: '60px', height: '60px', objectFit: 'contain', flexShrink: 0 }} />
            Log Meal
          </button>

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
              <p style={{ margin: '0 0 4px 0', fontWeight: '700', textAlign: 'center', fontSize: '20px', color: '#4A2E1F' }}>
                How was it?
              </p>
              <p style={{ margin: '0 0 16px 0', fontSize: '12px', textAlign: 'center', color: '#7A5A44', opacity: 0.7 }}>
                Bristol Stool Scale
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
                {BRISTOL_TYPES.map(t => (
                  <button
                    key={t.val}
                    onClick={() => handleSeverityPick(t.val)}
                    style={{
                      width: 'calc(25% - 6px)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                      padding: '8px 2px 6px',
                      border: selectedSeverity === t.val ? '2px solid #4A2E1F' : '2px solid #E8D5C0',
                      borderRadius: '12px',
                      background: selectedSeverity === t.val ? '#F5E6D3' : '#FFF',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#4A2E1F', opacity: 0.5 }}>{t.val}</span>
                    {BRISTOL_ICONS[t.val]}
                    <span style={{ fontSize: '10px', fontWeight: '600', color: '#4A2E1F', lineHeight: 1.2, textAlign: 'center' }}>{t.label}</span>
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
