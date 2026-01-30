import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { offlinePost } from '../services/api';
import cameraIcon from '../assets/camera-icon.png';
import poopIcon from '../assets/poop-icon.png';

function Home() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSeverityPicker, setShowSeverityPicker] = useState(false);
  const [puffs, setPuffs] = useState([]);
  const [squishing, setSquishing] = useState(false);
  const puffIdRef = useRef(0);

  const handlePhotoCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      navigate('/log-meal', { state: { capturedImage: file } });
    }
    e.target.value = '';
  };

  const handlePoopClick = () => {
    setSquishing(true);
    const newPuffs = Array.from({ length: 4 }, (_, i) => ({
      id: puffIdRef.current++,
      left: 38 + i * 8 + (Math.random() * 6 - 3),
      size: 10 + Math.random() * 8,
      delay: i * 80,
    }));
    setPuffs(prev => [...prev, ...newPuffs]);
    setTimeout(() => {
      setPuffs(prev => prev.filter(p => !newPuffs.some(np => np.id === p.id)));
    }, 950);
    setTimeout(() => {
      setSquishing(false);
      setShowSeverityPicker(true);
    }, 200);
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

          <div style={{ position: 'relative' }}>
            {puffs.map(puff => (
              <div
                key={puff.id}
                className="gas-puff"
                style={{
                  left: `${puff.left}%`,
                  top: '10px',
                  width: `${puff.size}px`,
                  height: `${puff.size}px`,
                  animationDelay: `${puff.delay}ms`,
                }}
              />
            ))}
            {!showSeverityPicker ? (
              <button
                className={`btn btn-secondary${squishing ? ' btn-squish' : ''}`}
                onClick={handlePoopClick}
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
    </div>
  );
}

export default Home;
