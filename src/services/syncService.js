/**
 * Sync Service - Handles uploading queued offline data when back online
 */

import api from './api';
import {
  getPendingRequests,
  getPendingImage,
  deletePendingRequest,
  base64ToBlob
} from './offlineStorage';

let isSyncing = false;
let syncListeners = [];

// Add listener for sync events
export function addSyncListener(callback) {
  syncListeners.push(callback);
  return () => {
    syncListeners = syncListeners.filter(cb => cb !== callback);
  };
}

// Notify listeners
function notifySyncListeners(event, data) {
  syncListeners.forEach(cb => cb(event, data));
}

// Sync all pending requests
export async function syncPendingRequests() {
  if (isSyncing || !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  isSyncing = true;
  notifySyncListeners('sync-start', {});

  let synced = 0;
  let failed = 0;

  try {
    const pending = await getPendingRequests();

    for (const request of pending) {
      try {
        await syncRequest(request);
        await deletePendingRequest(request.id);
        synced++;
        notifySyncListeners('sync-progress', { synced, total: pending.length });
      } catch (error) {
        console.error('Failed to sync request:', request.id, error);
        failed++;
      }
    }
  } catch (error) {
    console.error('Sync error:', error);
  } finally {
    isSyncing = false;
    notifySyncListeners('sync-complete', { synced, failed });
  }

  return { synced, failed };
}

// Sync individual request
async function syncRequest(request) {
  switch (request.type) {
    case 'poop':
      await api.post('/poops', request.data);
      break;

    case 'manual-meal':
      await api.post('/meals/manual', request.data);
      break;

    case 'meal':
      // For meal with image, we need to reconstruct the FormData
      const imageData = await getPendingImage(request.id);
      if (imageData) {
        const blob = base64ToBlob(imageData);
        const formData = new FormData();
        formData.append('image', blob, 'meal.jpg');

        await api.post('/meals', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      break;

    default:
      console.warn('Unknown request type:', request.type);
  }
}

// Set up online/offline listeners
export function setupOnlineListener() {
  window.addEventListener('online', async () => {
    console.log('Back online - starting sync');
    notifySyncListeners('online', {});

    // Small delay to ensure connection is stable
    setTimeout(async () => {
      const result = await syncPendingRequests();
      if (result.synced > 0) {
        console.log(`Synced ${result.synced} pending items`);
      }
    }, 1000);
  });

  window.addEventListener('offline', () => {
    console.log('Went offline');
    notifySyncListeners('offline', {});
  });
}

// Check if we're online
export function isOnline() {
  return navigator.onLine;
}
