import axios from 'axios';
import { savePendingRequest, fileToBase64, getPendingCount } from './offlineStorage';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle responses and offline errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Wrapper for offline-capable POST requests
export async function offlinePost(url, data, options = {}) {
  // If online, try the normal request
  if (navigator.onLine) {
    try {
      return await api.post(url, data, options);
    } catch (error) {
      // If network error while supposedly online, queue it
      if (!error.response) {
        return await queueOfflineRequest(url, data, options);
      }
      throw error;
    }
  }

  // If offline, queue the request
  return await queueOfflineRequest(url, data, options);
}

// Queue a request for later sync
async function queueOfflineRequest(url, data, options) {
  let type = 'unknown';
  let requestData = data;
  let imageData = null;

  // Determine request type and extract data
  if (url === '/poops') {
    type = 'poop';
    requestData = data;
  } else if (url === '/meals/manual') {
    type = 'manual-meal';
    requestData = data;
  } else if (url === '/meals' && data instanceof FormData) {
    type = 'meal';
    // Extract image from FormData and convert to base64
    const imageFile = data.get('image');
    if (imageFile) {
      imageData = await fileToBase64(imageFile);
    }
    requestData = {}; // We'll reconstruct from image
  }

  const id = await savePendingRequest(type, requestData, imageData);

  // Return a mock response so the UI still works
  return {
    data: {
      id: `offline-${id}`,
      offline: true,
      timestamp: new Date().toISOString(),
      ...requestData
    }
  };
}

// Get pending sync count
export async function getOfflinePendingCount() {
  try {
    return await getPendingCount();
  } catch {
    return 0;
  }
}

export default api;
