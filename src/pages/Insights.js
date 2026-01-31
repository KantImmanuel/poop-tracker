import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { getGuestStats } from '../services/guestStorage';
import { isReadyForInsights } from '../utils/insightReadiness';

function Insights() {
  const navigate = useNavigate();
  const { isGuest } = useAuth();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchInsights = useCallback(async () => {
    try {
      if (isGuest) {
        const stats = await getGuestStats();
        setInsights(stats);
      } else {
        const response = await api.get('/insights/correlations');
        setInsights(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    } finally {
      setLoading(false);
    }
  }, [isGuest]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  // Derived state
  const mealsCount = insights?.totalMeals || 0;
  const poopsCount = insights?.totalPoops || 0;
  const daysCovered = insights?.daysCovered || 0;
  const readyForInsights = isReadyForInsights({ mealsCount, poopsCount, daysCovered });
  const hasAnalysis = !!(insights?.triggers?.length > 0 || insights?.summary);
  const hasAnyData = mealsCount + poopsCount > 0;

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

  const renderProgressRow = (label, count, target, last = false) => {
    const done = count >= target;
    const pct = Math.min(100, (count / target) * 100);
    return (
      <div style={{ marginBottom: last ? 0 : '16px' }} key={label}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '14px', color: '#4A2E1F', fontWeight: '500' }}>{label}</span>
          <span style={{ fontSize: '14px', color: done ? '#5A8A60' : '#7A5A44', fontWeight: '600' }}>
            {done ? '✓' : `${count} / ${target}`}
          </span>
        </div>
        <div style={{ height: '6px', borderRadius: '3px', background: '#E8D9C8', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: '3px',
            background: done ? '#5A8A60' : '#7E8B47',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
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
      <div className="page-header">
        <h1 className="page-title">Insights</h1>
      </div>

      <div className="container">
        {/* ── Analyze button: visible when ready or has analysis ── */}
        {(readyForInsights || hasAnalysis) && !analyzing && !isGuest && (
          <>
            <button
              className="btn btn-primary mb-2"
              onClick={handleAnalyze}
              disabled={analyzing}
            >
              {insights?.lastAnalyzed ? 'Re-analyze My Data' : 'Analyze My Data'}
            </button>

            {insights?.lastAnalyzed && (
              <p style={{ fontSize: '12px', color: '#7A5A44', textAlign: 'center', margin: '-8px 0 12px' }}>
                Last analyzed {new Date(insights.lastAnalyzed).toLocaleDateString()}
              </p>
            )}

            {!hasAnalysis && readyForInsights && (
              <p style={{ fontSize: '13px', color: '#7A5A44', textAlign: 'center', margin: '-4px 0 16px', lineHeight: '1.4' }}>
                These are early signals — they'll get clearer as you log more.
              </p>
            )}
          </>
        )}

        {/* ── Guest: Sign up to unlock analysis ── */}
        {isGuest && readyForInsights && !hasAnalysis && (
          <div className="card text-center">
            <h3 style={{ margin: '0 0 8px 0', color: '#4A2E1F' }}>Ready for your first analysis</h3>
            <p style={{ margin: '0 0 16px', color: '#7A5A44', fontSize: '14px', lineHeight: '1.5' }}>
              You have enough data. Create a free account to unlock AI-powered insights into your food triggers.
            </p>
            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={() => navigate('/register')}
            >
              Sign up to unlock insights
            </button>
            <p style={{ fontSize: '12px', color: '#7A5A44', margin: '8px 0 0' }}>
              Your logged data will be saved to your account.
            </p>
          </div>
        )}

        {/* ── Analyzing spinner ── */}
        {analyzing && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Analyzing your data for patterns...</p>
          </div>
        )}

        {/* ── Analysis results ── */}
        {!analyzing && hasAnalysis && (
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
        )}

        {/* ── Ready but no analysis yet (authenticated users only) ── */}
        {!analyzing && !hasAnalysis && readyForInsights && !isGuest && (
          <div className="card text-center">
            <p style={{ color: '#4A2E1F', lineHeight: '1.5', margin: 0 }}>
              You have enough data for your first analysis. Tap "Analyze My Data" above to get started.
            </p>
          </div>
        )}

        {/* ── Calibration state ── */}
        {!analyzing && !hasAnalysis && !readyForInsights && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#4A2E1F', fontWeight: '700' }}>
                We're learning your patterns
              </h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#7A5A44', lineHeight: '1.5' }}>
                Log a few entries and we'll start surfacing early insights. Insights get stronger over time.
              </p>
            </div>

            <div className="card">
              <h3 style={{ margin: '0 0 16px 0' }}>Progress toward your first insight</h3>
              {renderProgressRow('Meals logged', mealsCount, 3)}
              {renderProgressRow('Bowel movements', poopsCount, 2)}
              {renderProgressRow('Days covered', daysCovered, 2, true)}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => navigate('/')}
              >
                Log a meal
              </button>
              <button
                onClick={() => navigate('/')}
                style={{
                  flex: 1,
                  background: 'none',
                  border: '2px solid #E8D9C8',
                  borderRadius: '16px',
                  color: '#7A5A44',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '12px 16px',
                  fontFamily: 'inherit'
                }}
              >
                Log a bowel movement
              </button>
            </div>

            <p style={{ fontSize: '11px', color: '#7A5A44', textAlign: 'center', margin: '-8px 0 12px', opacity: 0.7 }}>
              Takes ~5 seconds per log.
            </p>

            <p style={{ fontSize: '12px', color: '#7A5A44', textAlign: 'center', margin: '0 0 16px' }}>
              Most people start noticing patterns within 1–2 weeks.
            </p>
          </>
        )}

        {/* ── Stats / Baseline ── */}
        {!analyzing && (hasAnalysis || hasAnyData) && (
          <div className="card mt-2">
            <h3 style={{ margin: '0 0 12px 0' }}>{hasAnalysis ? 'Your Stats' : 'Your baseline'}</h3>
            <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
              <div>
                <p style={{ fontSize: '24px', fontWeight: '600', margin: 0 }}>
                  {mealsCount}
                </p>
                <p style={{ fontSize: '14px', color: '#7A5A44', margin: '4px 0 0' }}>Meals</p>
              </div>
              <div>
                <p style={{ fontSize: '24px', fontWeight: '600', margin: 0, color: '#4A2E1F' }}>
                  {poopsCount}
                </p>
                <p style={{ fontSize: '14px', color: '#7A5A44', margin: '4px 0 0' }}>
                  {hasAnalysis ? 'Poops' : 'Bowel Movements'}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '24px', fontWeight: '600', margin: 0, color: '#4A2E1F' }}>
                  {insights?.daysTracked || 0}
                </p>
                <p style={{ fontSize: '14px', color: '#7A5A44', margin: '4px 0 0' }}>Days</p>
              </div>
            </div>
            {!hasAnalysis && (
              <p style={{ fontSize: '12px', color: '#7A5A44', textAlign: 'center', margin: '12px 0 0' }}>
                Every entry helps us learn what's normal for you.
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default Insights;
