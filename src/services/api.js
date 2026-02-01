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

// Refresh token interceptor
let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
}

function forceLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  delete api.defaults.headers.common['Authorization'];
  window.location.href = '/login';
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 403 = truly invalid token, force logout
    if (error.response?.status === 403) {
      forceLogout();
      return Promise.reject(error);
    }

    // 401 = expired, attempt refresh (but not for refresh/login/register requests)
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register')
    ) {
      if (isRefreshing) {
        // Queue this request while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        isRefreshing = false;
        forceLogout();
        return Promise.reject(error);
      }

      try {
        // Use raw axios to avoid interceptor recursion
        const baseURL = api.defaults.baseURL;
        const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });

        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;

        processQueue(null, data.token);

        originalRequest.headers['Authorization'] = `Bearer ${data.token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        forceLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
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
