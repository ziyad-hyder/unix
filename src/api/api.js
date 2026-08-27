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

// Response interceptor: Extract structured backend error message
api.interceptors.response.use(
  (response) => response,
  (error) => {
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
