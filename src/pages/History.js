import { useState, useEffect } from 'react';
import api from '../services/api';

function History() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const [mealsRes, poopsRes] = await Promise.all([
        api.get('/meals'),
        api.get('/poops')
      ]);

      const combined = [
        ...mealsRes.data.map(m => ({ ...m, type: 'meal' })),
        ...poopsRes.data.map(p => ({ ...p, type: 'poop' }))
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setEntries(combined);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const groupByDate = (items) => {
    const groups = {};
    items.forEach(item => {
      const date = formatDate(item.timestamp);
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return groups;
  };

  const grouped = groupByDate(entries);

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">History</h1>
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
        <h1 className="page-title">History</h1>
      </div>

      <div className="container">
        {entries.length === 0 ? (
          <div className="card text-center">
            <p className="text-muted">No entries yet. Start logging!</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <p style={{ fontWeight: '600', color: '#666', marginBottom: '8px' }}>{date}</p>
              {items.map((item, index) => (
                <div key={item.id || index} className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '24px' }}>
                    {item.type === 'meal' ? '🍽️' : '💩'}
                  </span>
                  <div style={{ flex: 1 }}>
                    {item.type === 'meal' ? (
                      <>
                        <p style={{ margin: 0, fontWeight: '600' }}>
                          {item.foods?.map(f => f.name).join(', ') || 'Meal'}
                        </p>
                        <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#999' }}>
                          {formatTime(item.timestamp)}
                        </p>
                      </>
                    ) : (
                      <>
                        <p style={{ margin: 0, fontWeight: '600' }}>Bowel Movement</p>
                        <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#999' }}>
                          {formatTime(item.timestamp)}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default History;
