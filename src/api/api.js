import axios from 'axios';

// Create base Axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '',
  withCredentials: true, // Crucial: Always send/receive httpOnly JWT cookies cross-origin
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

console.log("API base URL:", import.meta.env.VITE_API_URL);

// Request interceptor:
// 1. Attach Bearer token from localStorage for reliable cross-origin auth (iOS Safari, mobile browsers)
// 2. If payload is FormData, delete default Content-Type header so browser appends proper boundary
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('unix_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Response interceptor: Extract structured backend error & clear token on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('unix_token');
    }

    if (import.meta.env.DEV) {
      console.error('[API Response Error]:', error);
    }

    const rawMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      '';

    // Never show raw internal exceptions or "No static resource"
    const isInternalString =
      rawMessage.toLowerCase().includes('static resource') ||
      rawMessage.toLowerCase().includes('exception') ||
      rawMessage.toLowerCase().includes('spring') ||
      rawMessage.toLowerCase().includes('hibernate');

    const message = isInternalString
      ? 'The requested operation could not be completed. Please try again.'
      : (rawMessage || 'A network error occurred. Please try again.');

    const customError = {
      status: error.response?.status || 500,
      message,
      errorCode: error.response?.data?.errorCode || null,
      validationErrors: error.response?.data?.validationErrors || null,
      raw: error,
    };
    return Promise.reject(customError);
  }
);

export default api;
