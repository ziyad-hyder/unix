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

// Response interceptor: Extract structured backend error message & clear token on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('unix_token');
    }

    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'A network error occurred. Please try again.';

    const customError = {
      status: error.response?.status || 500,
      message,
      validationErrors: error.response?.data?.validationErrors || null,
      raw: error,
    };
    return Promise.reject(customError);
  }
);

export default api;
