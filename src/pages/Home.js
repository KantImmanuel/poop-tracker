import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function Home() {
  const navigate = useNavigate();
  const [todayStats, setTodayStats] = useState({ meals: 0, poops: 0 });
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTodayStats();
  }, []);

  const fetchTodayStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [mealsRes, poopsRes] = await Promise.all([
        api.get(`/meals?date=${today}`),
        api.get(`/poops?date=${today}`)
      ]);
      setTodayStats({
        meals: mealsRes.data.length,
        poops: poopsRes.data.length
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleLogPoop = async () => {
    setLoading(true);
    try {
      await api.post('/poops');
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/log-meal')}
            style={{ padding: '32px' }}
          >
            <span style={{ fontSize: '32px' }}>📷</span>
            Log Meal
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleLogPoop}
            disabled={loading}
            style={{ padding: '32px' }}
          >
            <span style={{ fontSize: '32px' }}>💩</span>
            {loading ? 'Logging...' : 'Log Poop'}
          </button>
        </div>

        <div className="card mt-3 text-center">
          <p className="text-muted mb-1">Today</p>
          <p style={{ fontSize: '18px', margin: 0 }}>
            <strong>{todayStats.meals}</strong> meals · <strong>{todayStats.poops}</strong> poops
          </p>
        </div>
      </div>
    </div>
  );
}

export default Home;
