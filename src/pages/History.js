import { useState, useEffect } from 'react';
import api from '../services/api';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function getWeekDays() {
  const today = new Date();
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    days.push(date);
  }
  return days;
}

function getMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push(new Date(year, month, d));
  }
  return cells;
}

function isSameDay(a, b) {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function History() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editSeverity, setEditSeverity] = useState(null);
  const [editFoods, setEditFoods] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

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
    const todayDate = new Date();
    const yesterday = new Date(todayDate);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === todayDate.toDateString()) {
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

  const handleDayClick = (date) => {
    if (selectedDate && isSameDay(selectedDate, date)) {
      setSelectedDate(null);
    } else {
      setSelectedDate(date);
    }
  };

  const handleMonthDayClick = (date) => {
    if (!date) return;
    setSelectedDate(date);
    setCalendarExpanded(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleCardClick = (item) => {
    if (editingId) return;
    if (expandedId === item.id) {
      setExpandedId(null);
      setConfirmDeleteId(null);
    } else {
      setExpandedId(item.id);
      setConfirmDeleteId(null);
    }
  };

  const handleDelete = async (item) => {
    setActionLoading(true);
    try {
      const endpoint = item.type === 'meal' ? '/meals' : '/poops';
      await api.delete(`${endpoint}/${item.id}`);
      setEntries(prev => prev.filter(e => e.id !== item.id));
      setExpandedId(null);
      setConfirmDeleteId(null);
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    if (item.type === 'poop') {
      setEditSeverity(item.severity || null);
    } else {
      setEditFoods(item.foods?.map(f => ({ id: f.id, name: f.name })) || []);
    }
  };

  const savePoopEdit = async (item) => {
    setActionLoading(true);
    try {
      await api.put(`/poops/${item.id}`, { severity: editSeverity });
      setEntries(prev => prev.map(e =>
        e.id === item.id ? { ...e, severity: editSeverity } : e
      ));
      setEditingId(null);
      setExpandedId(null);
    } catch (error) {
      console.error('Update failed:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const saveMealEdit = async (item) => {
    setActionLoading(true);
    try {
      const res = await api.put(`/meals/${item.id}`, { foods: editFoods });
      setEntries(prev => prev.map(e =>
        e.id === item.id ? { ...e, foods: res.data.foods } : e
      ));
      setEditingId(null);
      setExpandedId(null);
    } catch (error) {
      console.error('Update failed:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const filteredEntries = selectedDate
    ? entries.filter(e => isSameDay(new Date(e.timestamp), selectedDate))
    : entries;

  const grouped = groupByDate(filteredEntries);
  const weekDays = getWeekDays();
  const monthGrid = getMonthGrid(viewYear, viewMonth);

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
        {/* ── Week strip ── */}
        <div className="history-week-strip">
          <div className="history-week-days">
            {weekDays.map((date, i) => {
              const isSelected = isSameDay(selectedDate, date);
              const isToday = isSameDay(today, date);
              return (
                <button
                  key={i}
                  className={`history-day${isSelected ? ' selected' : ''}${isToday && !isSelected ? ' today' : ''}`}
                  onClick={() => handleDayClick(date)}
                >
                  <span className="history-day-label">{DAY_LABELS[i]}</span>
                  <span className="history-day-num">{date.getDate()}</span>
                </button>
              );
            })}
          </div>
          <button
            className={`history-calendar-toggle${calendarExpanded ? ' active' : ''}`}
            onClick={() => setCalendarExpanded(!calendarExpanded)}
            aria-label="Expand calendar"
          >
            <span style={{ fontSize: '18px' }}>&#x1F4C5;</span>
          </button>
        </div>

        {/* ── Expanded month calendar ── */}
        {calendarExpanded && (
          <div className="history-month-calendar">
            <div className="history-month-header">
              <button className="history-month-arrow" onClick={prevMonth}>&lsaquo;</button>
              <span className="history-month-title">{MONTH_NAMES[viewMonth]} {viewYear}</span>
              <button className="history-month-arrow" onClick={nextMonth}>&rsaquo;</button>
            </div>
            <div className="history-month-labels">
              {DAY_LABELS.map((l, i) => (
                <span key={i}>{l}</span>
              ))}
            </div>
            <div className="history-month-grid">
              {monthGrid.map((date, i) => {
                if (!date) return <span key={i} className="history-month-cell empty" />;
                const isSelected = isSameDay(selectedDate, date);
                const isToday = isSameDay(today, date);
                return (
                  <button
                    key={i}
                    className={`history-month-cell${isSelected ? ' selected' : ''}${isToday && !isSelected ? ' today' : ''}`}
                    onClick={() => handleMonthDayClick(date)}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selectedDate && (
          <button
            className="history-clear-filter"
            onClick={() => setSelectedDate(null)}
          >
            Show all &times;
          </button>
        )}

        {/* ── Entry list ── */}
        {filteredEntries.length === 0 ? (
          <div className="card text-center">
            <p className="text-muted">
              {selectedDate ? 'No entries on this day.' : 'No entries yet. Start logging!'}
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <p style={{ fontWeight: '600', color: '#7A5A44', marginBottom: '8px' }}>{date}</p>
              {items.map((item, index) => {
                const isExpanded = expandedId === item.id;
                const isEditing = editingId === item.id;
                const isConfirming = confirmDeleteId === item.id;
                return (
                  <div
                    key={item.id || index}
                    className={`card history-entry-card${isExpanded ? ' expanded' : ''}`}
                    onClick={() => handleCardClick(item)}
                  >
                    <div className="history-entry-row">
                      <span style={{ fontSize: '24px' }}>
                        {item.type === 'meal' ? '🍽️' : '💩'}
                      </span>
                      <div style={{ flex: 1 }}>
                        {item.type === 'meal' ? (
                          <>
                            <p style={{ margin: 0, fontWeight: '600' }}>
                              {item.foods?.map(f => f.name).join(', ') || 'Meal'}
                            </p>
                            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#7A5A44' }}>
                              {formatTime(item.timestamp)}
                            </p>
                          </>
                        ) : (
                          <>
                            <p style={{ margin: 0, fontWeight: '600', color: '#4A2E1F' }}>
                              Bowel Movement
                              {item.severity && (
                                <span style={{ marginLeft: '8px', fontWeight: '400' }}>
                                  {item.severity === 'mild' && '😊 Easy'}
                                  {item.severity === 'moderate' && '😐 Meh'}
                                  {item.severity === 'severe' && '😣 Uh-oh'}
                                </span>
                              )}
                            </p>
                            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#7A5A44' }}>
                              {formatTime(item.timestamp)}
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {isExpanded && !isEditing && !isConfirming && (
                      <div className="history-card-actions" onClick={e => e.stopPropagation()}>
                        <button
                          className="history-action-btn"
                          onClick={() => startEdit(item)}
                        >
                          Edit
                        </button>
                        <button
                          className="history-action-btn delete"
                          onClick={() => setConfirmDeleteId(item.id)}
                        >
                          Delete
                        </button>
                      </div>
                    )}

                    {isConfirming && (
                      <div className="history-confirm-row" onClick={e => e.stopPropagation()}>
                        <span style={{ fontSize: '14px', color: '#7A5A44' }}>Delete this entry?</span>
                        <button
                          className="history-action-btn delete"
                          onClick={() => handleDelete(item)}
                          disabled={actionLoading}
                        >
                          {actionLoading ? '...' : 'Yes, delete'}
                        </button>
                        <button
                          className="history-action-btn"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {isEditing && item.type === 'poop' && (
                      <div className="history-edit-severity" onClick={e => e.stopPropagation()}>
                        {[
                          { val: 'mild', label: '😊 Easy' },
                          { val: 'moderate', label: '😐 Meh' },
                          { val: 'severe', label: '😣 Uh-oh' }
                        ].map(s => (
                          <button
                            key={s.val}
                            className={`history-severity-btn${editSeverity === s.val ? ' active' : ''}`}
                            onClick={() => setEditSeverity(s.val)}
                          >
                            {s.label}
                          </button>
                        ))}
                        <div className="history-edit-btns">
                          <button
                            className="history-action-btn save"
                            onClick={() => savePoopEdit(item)}
                            disabled={actionLoading}
                          >
                            {actionLoading ? '...' : 'Save'}
                          </button>
                          <button className="history-action-btn" onClick={cancelEdit}>Cancel</button>
                        </div>
                      </div>
                    )}

                    {isEditing && item.type === 'meal' && (
                      <div className="history-edit-foods" onClick={e => e.stopPropagation()}>
                        {editFoods.map((f, fi) => (
                          <input
                            key={f.id}
                            className="history-edit-input"
                            value={f.name}
                            onChange={e => {
                              const updated = [...editFoods];
                              updated[fi] = { ...updated[fi], name: e.target.value };
                              setEditFoods(updated);
                            }}
                          />
                        ))}
                        <div className="history-edit-btns">
                          <button
                            className="history-action-btn save"
                            onClick={() => saveMealEdit(item)}
                            disabled={actionLoading}
                          >
                            {actionLoading ? '...' : 'Save'}
                          </button>
                          <button className="history-action-btn" onClick={cancelEdit}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default History;
