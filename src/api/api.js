import axios from 'axios';
import { getCookie } from '../utils/cookies';

// Create base Axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  withCredentials: true, // Crucial: Always send/receive httpOnly JWT cookies cross-origin
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor: Inject XSRF-TOKEN header for state-changing requests
api.interceptors.request.use(
  (config) => {
    const method = config.method ? config.method.toUpperCase() : 'GET';
    const stateChangingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];

    if (stateChangingMethods.includes(method)) {
      const xsrfToken = getCookie('XSRF-TOKEN');
      if (xsrfToken) {
        config.headers['X-XSRF-TOKEN'] = xsrfToken;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Extract structured backend error message
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const customError = {
      status: error.response?.status || 500,
      message: error.response?.data?.message || 'A network error occurred. Please try again.',
      validationErrors: error.response?.data?.validationErrors || null,
      raw: error,
    };
    return Promise.reject(customError);
  }
);

export default api;
