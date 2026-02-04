import api from './api';

// Generate a random session ID (persisted per browser session)
function getSessionId() {
  let id = sessionStorage.getItem('_sid');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('_sid', id);
  }
  return id;
}

export function trackEvent(action) {
  const isGuest = localStorage.getItem('guestMode') === 'true';
  const sessionId = getSessionId();

  // Fire-and-forget — don't block the UI or surface errors
  api.post('/events', { action, isGuest, sessionId }).catch(() => {});
}
