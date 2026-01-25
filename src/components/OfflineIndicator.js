import { useState, useEffect } from 'react';
import { setupOnlineListener, addSyncListener, syncPendingRequests } from '../services/syncService';
import { getPendingCount } from '../services/offlineStorage';

function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);

  useEffect(() => {
    // Set up online/offline listeners
    setupOnlineListener();

    // Update online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for sync events
    const unsubscribe = addSyncListener((event, data) => {
      switch (event) {
        case 'sync-start':
          setSyncing(true);
          break;
        case 'sync-complete':
          setSyncing(false);
          updatePendingCount();
          if (data.synced > 0) {
            setShowSyncSuccess(true);
            setTimeout(() => setShowSyncSuccess(false), 3000);
          }
          break;
        case 'online':
          setIsOnline(true);
          break;
        case 'offline':
          setIsOnline(false);
          break;
        default:
          break;
      }
    });

    // Initial pending count
    updatePendingCount();

    // Poll for pending count updates
    const interval = setInterval(updatePendingCount, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const updatePendingCount = async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch (e) {
      // Ignore errors
    }
  };

  const handleManualSync = async () => {
    if (isOnline && pendingCount > 0) {
      await syncPendingRequests();
    }
  };

  // Don't show anything if online and no pending
  if (isOnline && pendingCount === 0 && !showSyncSuccess) {
    return null;
  }

  return (
    <>
      {/* Offline banner */}
      {!isOnline && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          background: '#fbbf24',
          color: '#78350f',
          padding: '8px 16px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: '500',
          zIndex: 1000
        }}>
          📴 You're offline - data will sync when connected
        </div>
      )}

      {/* Pending sync indicator */}
      {pendingCount > 0 && (
        <div
          onClick={handleManualSync}
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '16px',
            background: isOnline ? '#3b82f6' : '#9ca3af',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '24px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: isOnline ? 'pointer' : 'default',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 999
          }}
        >
          {syncing ? (
            <>
              <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
              Syncing...
            </>
          ) : (
            <>
              {isOnline ? '🔄' : '⏳'} {pendingCount} pending
            </>
          )}
        </div>
      )}

      {/* Sync success toast */}
      {showSyncSuccess && (
        <div style={{
          position: 'fixed',
          bottom: '140px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#10b981',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
          zIndex: 1000,
          animation: 'fadeIn 0.3s ease'
        }}>
          ✓ Data synced successfully!
        </div>
      )}
    </>
  );
}

export default OfflineIndicator;
