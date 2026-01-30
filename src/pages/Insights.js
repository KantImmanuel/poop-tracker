import { useState, useEffect } from 'react';
import api from '../services/api';

function Insights() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

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
        <button
          className="btn btn-primary mb-2"
          onClick={handleAnalyze}
          disabled={analyzing || !hasEnoughData}
          style={{ opacity: hasEnoughData ? 1 : 0.5 }}
        >
          {analyzing ? 'Analyzing...' : 'Analyze My Data'}
        </button>

        {analyzing && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Analyzing your data for patterns...</p>
          </div>
        )}

        {!analyzing && (
          (!insights || !insights.triggers?.length) ? (
            <div className="card text-center">
              <p className="text-muted">
                Keep logging meals and bowel movements. Once you have enough data,
                we'll identify patterns and potential trigger foods.
              </p>
              {!hasEnoughData && (
                <div style={{ fontSize: '14px', color: '#B0A090', marginTop: '12px' }}>
                  <p style={{ margin: '0 0 8px 0', fontWeight: '500', color: '#8B7D6B' }}>Minimum required:</p>
                  <p style={{ margin: '4px 0' }}>
                    {(insights?.totalMeals || 0) >= 3 ? '✓' : '○'} 3 meals logged ({insights?.totalMeals || 0}/3)
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    {(insights?.totalPoops || 0) >= 3 ? '✓' : '○'} 3 poops logged ({insights?.totalPoops || 0}/3)
                  </p>
                </div>
              )}
              <p style={{ fontSize: '14px', color: '#B0A090', marginTop: '12px' }}>
                {hasEnoughData
                  ? 'Tap "Analyze My Data" to identify potential trigger foods.'
                  : 'Tip: 1-2 weeks of data gives the best insights.'}
              </p>
            </div>
          ) : (
            <>
              <div className="card">
                <h3 style={{ margin: '0 0 16px 0' }}>Potential Triggers</h3>
                <p style={{ fontSize: '14px', color: '#8B7D6B', marginBottom: '16px' }}>
                  These foods/ingredients appear correlated with increased bowel movements:
                </p>
                {insights.triggers.map((trigger, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 0',
                      borderBottom: index < insights.triggers.length - 1 ? '1px solid #E8DDD0' : 'none'
                    }}
                  >
                    <span style={{ fontWeight: '500' }}>{trigger.name}</span>
                    <span
                      style={{
                        background: trigger.confidence > 0.7 ? '#FDEAE8' : trigger.confidence > 0.4 ? '#FFF0DB' : '#E8F0E8',
                        color: trigger.confidence > 0.7 ? '#C44D3B' : trigger.confidence > 0.4 ? '#C47A20' : '#4A7C59',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      {Math.round(trigger.confidence * 100)}% likely
                    </span>
                  </div>
                ))}
              </div>

              {insights.notes && (
                <div className="card">
                  <h3 style={{ margin: '0 0 12px 0' }}>Notes</h3>
                  <p style={{ margin: 0, color: '#8B7D6B' }}>{insights.notes}</p>
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
              <p style={{ fontSize: '14px', color: '#B0A090', margin: '4px 0 0' }}>Meals</p>
            </div>
            <div>
              <p style={{ fontSize: '24px', fontWeight: '600', margin: 0, color: '#3D3229' }}>
                {insights?.totalPoops || 0}
              </p>
              <p style={{ fontSize: '14px', color: '#B0A090', margin: '4px 0 0' }}>Poops</p>
            </div>
            <div>
              <p style={{ fontSize: '24px', fontWeight: '600', margin: 0, color: '#3D3229' }}>
                {insights?.daysTracked || 0}
              </p>
              <p style={{ fontSize: '14px', color: '#B0A090', margin: '4px 0 0' }}>Days</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Insights;
