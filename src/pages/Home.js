import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { offlinePost } from '../services/api';

function Home() {
  const navigate = useNavigate();
  const [todayStats, setTodayStats] = useState({ meals: 0, poops: 0 });
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastPoopId, setLastPoopId] = useState(null);
  const [showUndo, setShowUndo] = useState(false);
  const [showSeverityPicker, setShowSeverityPicker] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchTodayStats();
  }, []);

  const fetchTodayStats = async () => {
    // Skip fetching if offline - stats will update when synced
    if (!navigator.onLine) return;

    try {
      // Use local timezone for "today" - fixes the midnight bug
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const today = `${year}-${month}-${day}`;

      const [mealsRes, poopsRes] = await Promise.all([
        api.get(`/meals?date=${today}`),
        api.get(`/poops?date=${today}`)
      ]);
      setTodayStats({
        meals: mealsRes.data.length,
        poops: poopsRes.data.length
      });
    } catch (error) {
      // Silently fail if offline or network error
      if (navigator.onLine) {
        console.error('Failed to fetch stats:', error);
      }
    }
  };

  const handleLogPoop = async (selectedSeverity = null) => {
    setLoading(true);
    setShowSeverityPicker(false);
    try {
      const response = await offlinePost('/poops', { severity: selectedSeverity });
      const isOffline = response.data.offline || String(response.data.id).startsWith('offline-');

      setLastPoopId(isOffline ? null : response.data.id);
      setTodayStats(prev => ({ ...prev, poops: prev.poops + 1 }));
      setShowSuccess(true);

      // Only show undo for online entries (can't undo offline)
      if (!isOffline) {
        setShowUndo(true);
        setTimeout(() => {
          setShowUndo(false);
          setLastPoopId(null);
        }, 10000);
      }

      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to log poop:', error);
      alert('Failed to log. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUndo = async () => {
    if (!lastPoopId || String(lastPoopId).startsWith('offline-')) return;
    try {
      await api.delete(`/poops/${lastPoopId}`);
      setTodayStats(prev => ({ ...prev, poops: Math.max(0, prev.poops - 1) }));
      setShowUndo(false);
      setLastPoopId(null);
    } catch (error) {
      console.error('Failed to undo:', error);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await api.post('/insights/analyze');
      navigate('/insights');
    } catch (error) {
      console.error('Failed to analyze:', error);
      alert('Failed to analyze. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="page">
      {showSuccess && <div className="success-flash">Logged!</div>}

      <div className="page-header">
        <h1 className="page-title">IBS Tracker</h1>
      </div>

      <div className="container">
        {/* Analyze button at top - immediately visible */}
        <button
          className="btn btn-outline mb-2"
          onClick={handleAnalyze}
          disabled={analyzing}
          style={{ width: '100%' }}
        >
          {analyzing ? 'Analyzing...' : '🔍 Analyze My Data'}
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/log-meal')}
            style={{ padding: '32px' }}
          >
            <span style={{ fontSize: '32px' }}>📷</span>
            Log Meal
          </button>

          {!showSeverityPicker ? (
            <button
              className="btn btn-secondary"
              onClick={() => setShowSeverityPicker(true)}
              disabled={loading}
              style={{ padding: '32px' }}
            >
              <span style={{ fontSize: '32px' }}>💩</span>
              {loading ? 'Logging...' : 'Log Poop'}
            </button>
          ) : (
            <div className="card" style={{ padding: '16px' }}>
              <p style={{ margin: '0 0 12px 0', fontWeight: '500', textAlign: 'center' }}>How was it?</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '12px' }}
                  onClick={() => handleLogPoop('mild')}
                >
                  😊 Mild
                </button>
                <button
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '12px' }}
                  onClick={() => handleLogPoop('moderate')}
                >
                  😐 Moderate
                </button>
                <button
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '12px' }}
                  onClick={() => handleLogPoop('severe')}
                >
                  😣 Severe
                </button>
              </div>
              <button
                className="btn btn-secondary mt-1"
                style={{ width: '100%' }}
                onClick={() => handleLogPoop(null)}
              >
                Skip - Just Log
              </button>
            </div>
          )}
        </div>

        {showUndo && (
          <div className="undo-container mt-2" style={{
            background: '#fef2f2',
            border: '2px solid #dc2626',
            borderRadius: '12px',
            padding: '12px',
            animation: 'fadeIn 0.3s ease'
          }}>
            <p style={{ margin: '0 0 8px 0', textAlign: 'center', color: '#dc2626', fontSize: '14px' }}>
              Poop logged! Made a mistake?
            </p>
            <button
              className="btn"
              onClick={handleUndo}
              style={{
                width: '100%',
                background: '#dc2626',
                color: 'white',
                padding: '12px',
                fontWeight: '600'
              }}
            >
              ↩️ Undo
            </button>
          </div>
        )}

        <div className="card mt-2 text-center">
          <p className="text-muted mb-1">Today</p>
          <p style={{ fontSize: '18px', margin: 0 }}>
            <strong>{todayStats.meals}</strong> meals · <strong>{todayStats.poops}</strong> poops
          </p>
        </div>

        {/* Manual meal entry link */}
        <button
          className="btn btn-outline mt-2"
          onClick={() => navigate('/log-meal?manual=true')}
          style={{ width: '100%' }}
        >
          ✏️ Add Meal Without Photo
        </button>
      </div>
    </div>
  );
}

export default Home;
