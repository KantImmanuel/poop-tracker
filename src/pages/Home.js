import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { offlinePost } from '../services/api';

function Home() {
  const navigate = useNavigate();
  const [todayStats, setTodayStats] = useState({ meals: 0, poops: 0 });
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSeverityPicker, setShowSeverityPicker] = useState(false);

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

  const handleLogPoop = async (selectedSeverity) => {
    setLoading(true);
    setShowSeverityPicker(false);
    try {
      await offlinePost('/poops', { severity: selectedSeverity });
      setTodayStats(prev => ({ ...prev, poops: prev.poops + 1 }));
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

      <div className="container">
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
            </div>
          )}
        </div>

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
