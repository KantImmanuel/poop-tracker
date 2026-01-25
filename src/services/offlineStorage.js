/**
 * Offline Storage Service using IndexedDB
 * Stores meals and poops locally when offline, syncs when back online
 */

const DB_NAME = 'ibs-tracker-offline';
const DB_VERSION = 1;

let db = null;

// Initialize IndexedDB
export async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Store for pending API requests (meals, poops)
      if (!database.objectStoreNames.contains('pendingRequests')) {
        const store = database.createObjectStore('pendingRequests', {
          keyPath: 'id',
          autoIncrement: true
        });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Store for cached images (base64)
      if (!database.objectStoreNames.contains('pendingImages')) {
        database.createObjectStore('pendingImages', {
          keyPath: 'id',
          autoIncrement: true
        });
      }
    };
  });
}

// Get database instance
async function getDB() {
  if (!db) {
    await initDB();
  }
  return db;
}

// Save a pending request for later sync
export async function savePendingRequest(type, data, imageData = null) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['pendingRequests', 'pendingImages'], 'readwrite');
    const requestStore = transaction.objectStore('pendingRequests');
    const imageStore = transaction.objectStore('pendingImages');

    const request = {
      type, // 'meal', 'poop', 'manual-meal'
      data,
      timestamp: Date.now(),
      synced: false
    };

    const addRequest = requestStore.add(request);

    addRequest.onsuccess = () => {
      const requestId = addRequest.result;

      // If there's image data, save it separately
      if (imageData) {
        const imageRecord = {
          requestId,
          imageData,
          timestamp: Date.now()
        };
        imageStore.add(imageRecord);
      }

      resolve(requestId);
    };

    addRequest.onerror = () => reject(addRequest.error);
  });
}

// Get all pending requests
export async function getPendingRequests() {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['pendingRequests'], 'readonly');
    const store = transaction.objectStore('pendingRequests');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get pending image for a request
export async function getPendingImage(requestId) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['pendingImages'], 'readonly');
    const store = transaction.objectStore('pendingImages');
    const request = store.getAll();

    request.onsuccess = () => {
      const images = request.result;
      const image = images.find(img => img.requestId === requestId);
      resolve(image ? image.imageData : null);
    };
    request.onerror = () => reject(request.error);
  });
}

// Delete a pending request after successful sync
export async function deletePendingRequest(id) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['pendingRequests', 'pendingImages'], 'readwrite');
    const requestStore = transaction.objectStore('pendingRequests');
    const imageStore = transaction.objectStore('pendingImages');

    // Delete the request
    requestStore.delete(id);

    // Delete associated image
    const imageRequest = imageStore.getAll();
    imageRequest.onsuccess = () => {
      const images = imageRequest.result;
      images.forEach(img => {
        if (img.requestId === id) {
          imageStore.delete(img.id);
        }
      });
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Get count of pending requests
export async function getPendingCount() {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['pendingRequests'], 'readonly');
    const store = transaction.objectStore('pendingRequests');
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Convert File to base64 for offline storage
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

// Convert base64 back to Blob for upload
export function base64ToBlob(base64) {
  const parts = base64.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}
