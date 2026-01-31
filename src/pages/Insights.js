import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function Insights() {
  const { logout } = useAuth();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      const response = await api.get('/insights/correlations');
      setInsights(response.data);
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasEnoughData = (insights?.totalMeals || 0) >= 3 && (insights?.totalPoops || 0) >= 3;

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const response = await api.post('/insights/analyze');
      setInsights(response.data);
    } catch (error) {
      console.error('Failed to analyze:', error);
      alert('Failed to analyze. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    if (newPassword.length < 6) {
      setPwError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match');
      return;
    }
    setPwLoading(true);
    try {
      await api.put('/auth/password', { currentPassword, newPassword });
      setPwSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPwSuccess(false);
        setShowChangePassword(false);
      }, 2000);
    } catch (error) {
      setPwError(error.response?.data?.message || 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header" style={{ position: 'relative' }}>
          <button
            onClick={logout}
            style={{
              position: 'absolute',
              top: '24px',
              right: '0',
              background: 'none',
              border: 'none',
              color: '#7A5A44',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              padding: '4px 8px',
              fontFamily: 'inherit'
            }}
          >
            Sign Out
          </button>
          <h1 className="page-title">Insights</h1>
        </div>
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header" style={{ position: 'relative' }}>
        <button
          onClick={logout}
          style={{
            position: 'absolute',
            top: '24px',
            right: '0',
            background: 'none',
            border: 'none',
            color: '#7A5A44',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            padding: '4px 8px',
            fontFamily: 'inherit'
          }}
        >
          Sign Out
        </button>
        <h1 className="page-title">Insights</h1>
      </div>

      <div className="container">
        <button
          className="btn btn-primary mb-2"
          onClick={handleAnalyze}
          disabled={analyzing || !hasEnoughData}
          style={{ opacity: hasEnoughData ? 1 : 0.5 }}
        >
          {analyzing ? 'Analyzing...' : insights?.lastAnalyzed ? 'Re-analyze My Data' : 'Analyze My Data'}
        </button>

        {insights?.lastAnalyzed && !analyzing && (
          <p style={{ fontSize: '12px', color: '#7A5A44', textAlign: 'center', margin: '-8px 0 12px' }}>
            Last analyzed {new Date(insights.lastAnalyzed).toLocaleDateString()}
          </p>
        )}

        {analyzing && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Analyzing your data for patterns...</p>
          </div>
        )}

        {!analyzing && (
          (!insights || (!insights.triggers?.length && !insights.summary)) ? (
            <div className="card text-center">
              <p className="text-muted">
                Keep logging meals and bowel movements. Once you have enough data,
                we'll identify patterns and potential trigger foods.
              </p>
              {!hasEnoughData && (
                <div style={{ fontSize: '14px', color: '#7A5A44', marginTop: '12px' }}>
                  <p style={{ margin: '0 0 8px 0', fontWeight: '500', color: '#7A5A44' }}>Minimum required:</p>
                  <p style={{ margin: '4px 0' }}>
                    {(insights?.totalMeals || 0) >= 3 ? '✓' : '○'} 3 meals logged ({insights?.totalMeals || 0}/3)
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    {(insights?.totalPoops || 0) >= 3 ? '✓' : '○'} 3 poops logged ({insights?.totalPoops || 0}/3)
                  </p>
                </div>
              )}
              <p style={{ fontSize: '14px', color: '#7A5A44', marginTop: '12px' }}>
                {hasEnoughData
                  ? 'Tap "Analyze My Data" to identify potential trigger foods.'
                  : 'Tip: 1-2 weeks of data gives the best insights.'}
              </p>
            </div>
          ) : (
            <>
              {/* Section 1: Summary */}
              {insights.summary && (
                <div className="card">
                  <h3 style={{ margin: '0 0 12px 0' }}>Summary</h3>
                  <p style={{ margin: 0, color: '#4A2E1F', lineHeight: '1.5' }}>{insights.summary}</p>
                </div>
              )}

              {/* Section 2: Potential Triggers */}
              {insights.triggers?.length > 0 && (
                <div className="card">
                  <h3 style={{ margin: '0 0 16px 0' }}>Potential Triggers</h3>
                  {insights.triggers.map((trigger, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '12px 0',
                        borderBottom: index < insights.triggers.length - 1 ? '1px solid #E8D9C8' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: '500' }}>{trigger.name}</span>
                        <span
                          style={{
                            background: trigger.confidence > 0.7 ? '#F5E3E0' : trigger.confidence > 0.4 ? '#F5ECDB' : '#E5EDE5',
                            color: trigger.confidence > 0.7 ? '#B8564A' : trigger.confidence > 0.4 ? '#B87A2E' : '#5A8A60',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}
                        >
                          {Math.round(trigger.confidence * 100)}% likely
                        </span>
                      </div>
                      {trigger.reason && (
                        <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#7A5A44' }}>{trigger.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Section 3: Safe Foods */}
              {insights.safeFoods?.length > 0 && (
                <div className="card">
                  <h3 style={{ margin: '0 0 16px 0' }}>Safe Foods</h3>
                  {insights.safeFoods.map((food, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '10px 0',
                        borderBottom: index < insights.safeFoods.length - 1 ? '1px solid #E8D9C8' : 'none'
                      }}
                    >
                      <span style={{ fontWeight: '500', color: '#5A8A60' }}>{food.name}</span>
                      {food.reason && (
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#7A5A44' }}>{food.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Section 4: Timing Insights */}
              {insights.timingInsights && (
                <div className="card">
                  <h3 style={{ margin: '0 0 12px 0' }}>Timing</h3>
                  <p style={{ margin: 0, color: '#4A2E1F', lineHeight: '1.5' }}>{insights.timingInsights}</p>
                </div>
              )}

              {/* Section 5: Next Steps */}
              {insights.nextSteps?.length > 0 && (
                <div className="card">
                  <h3 style={{ margin: '0 0 12px 0' }}>Next Steps</h3>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: '#4A2E1F', lineHeight: '1.8' }}>
                    {insights.nextSteps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Fallback: old-format notes if no new sections present */}
              {!insights.summary && insights.notes && (
                <div className="card">
                  <h3 style={{ margin: '0 0 12px 0' }}>Notes</h3>
                  <p style={{ margin: 0, color: '#7A5A44' }}>{insights.notes}</p>
                </div>
              )}
            </>
          )
        )}

        <div className="card mt-2">
          <h3 style={{ margin: '0 0 12px 0' }}>Your Stats</h3>
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            <div>
              <p style={{ fontSize: '24px', fontWeight: '600', margin: 0 }}>
                {insights?.totalMeals || 0}
              </p>
              <p style={{ fontSize: '14px', color: '#7A5A44', margin: '4px 0 0' }}>Meals</p>
            </div>
            <div>
              <p style={{ fontSize: '24px', fontWeight: '600', margin: 0, color: '#4A2E1F' }}>
                {insights?.totalPoops || 0}
              </p>
              <p style={{ fontSize: '14px', color: '#7A5A44', margin: '4px 0 0' }}>Poops</p>
            </div>
            <div>
              <p style={{ fontSize: '24px', fontWeight: '600', margin: 0, color: '#4A2E1F' }}>
                {insights?.daysTracked || 0}
              </p>
              <p style={{ fontSize: '14px', color: '#7A5A44', margin: '4px 0 0' }}>Days</p>
            </div>
          </div>
        </div>

        {!showChangePassword ? (
          <button
            onClick={() => { setShowChangePassword(true); setPwError(''); setPwSuccess(false); }}
            style={{
              background: 'none',
              border: '2px solid #E8D9C8',
              borderRadius: '16px',
              color: '#7A5A44',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              padding: '12px 24px',
              width: '100%',
              fontFamily: 'inherit'
            }}
          >
            Change Password
          </button>
        ) : (
          <div className="card">
            <h3 style={{ margin: '0 0 16px 0' }}>Change Password</h3>
            {pwSuccess && (
              <div style={{ background: '#E5EDE5', color: '#3A6B3A', padding: '10px 14px', borderRadius: '12px', marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
                Password updated!
              </div>
            )}
            {pwError && (
              <div style={{ background: '#F5E3E0', color: '#B8564A', padding: '10px 14px', borderRadius: '12px', marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
                {pwError}
              </div>
            )}
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  className="input"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  className="input"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  className="input"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  disabled={pwLoading}
                  style={{
                    flex: 1,
                    background: '#7E8B47',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    opacity: pwLoading ? 0.6 : 1
                  }}
                >
                  {pwLoading ? '...' : 'Update'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowChangePassword(false); setPwError(''); }}
                  style={{
                    flex: 1,
                    background: 'none',
                    border: '2px solid #E8D9C8',
                    borderRadius: '12px',
                    padding: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#7A5A44',
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default Insights;
