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
          disabled={analyzing}
        >
          {analyzing ? 'Analyzing...' : 'Analyze My Data'}
        </button>

        {!insights || !insights.triggers?.length ? (
          <div className="card text-center">
            <p className="text-muted">
              Keep logging meals and bowel movements. Once you have enough data,
              we'll identify patterns and potential trigger foods.
            </p>
            <p style={{ fontSize: '14px', color: '#999', marginTop: '12px' }}>
              Tip: Log for at least 1-2 weeks for better insights.
            </p>
          </div>
        ) : (
          <>
            <div className="card">
              <h3 style={{ margin: '0 0 16px 0' }}>Potential Triggers</h3>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
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
                    borderBottom: index < insights.triggers.length - 1 ? '1px solid #eee' : 'none'
                  }}
                >
                  <span style={{ fontWeight: '500' }}>{trigger.name}</span>
                  <span
                    style={{
                      background: trigger.confidence > 0.7 ? '#fee2e2' : trigger.confidence > 0.4 ? '#fef3c7' : '#e0e7ff',
                      color: trigger.confidence > 0.7 ? '#dc2626' : trigger.confidence > 0.4 ? '#d97706' : '#4f46e5',
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
                <p style={{ margin: 0, color: '#666' }}>{insights.notes}</p>
              </div>
            )}
          </>
        )}

        <div className="card mt-2">
          <h3 style={{ margin: '0 0 12px 0' }}>Your Stats</h3>
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            <div>
              <p style={{ fontSize: '24px', fontWeight: '600', margin: 0 }}>
                {insights?.totalMeals || 0}
              </p>
              <p style={{ fontSize: '14px', color: '#999', margin: '4px 0 0' }}>Meals</p>
            </div>
            <div>
              <p style={{ fontSize: '24px', fontWeight: '600', margin: 0 }}>
                {insights?.totalPoops || 0}
              </p>
              <p style={{ fontSize: '14px', color: '#999', margin: '4px 0 0' }}>Poops</p>
            </div>
            <div>
              <p style={{ fontSize: '24px', fontWeight: '600', margin: 0 }}>
                {insights?.daysTracked || 0}
              </p>
              <p style={{ fontSize: '14px', color: '#999', margin: '4px 0 0' }}>Days</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Insights;
