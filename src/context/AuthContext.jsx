import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { resetUnauthorizedGuard } from '../api/api';
import { trackEvent } from '../utils/analytics';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearApiCaches = async () => {
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const keys = await window.caches.keys();
        await Promise.all(
          keys
            .filter((k) => k.startsWith('unix-api-'))
            .map((k) => window.caches.delete(k))
        );
      } catch (err) {
        console.warn('Failed to delete window caches:', err);
      }
    }
    if (typeof navigator !== 'undefined' && navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_API_CACHES' });
    }
  };

  const forcedLogout = useCallback(async () => {
    localStorage.removeItem('unix_token');
    setUser(null);
    await clearApiCaches();
  }, []);

  // Hydrate auth state by calling /api/auth/me
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/auth/me');
      if (res.data?.success && res.data?.data) {
        setUser(res.data.data);
      } else {
        await forcedLogout();
      }
    } catch {
      await forcedLogout();
    } finally {
      setLoading(false);
    }
  }, [forcedLogout]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Listen for unauthorized events dispatched by API interceptor
  useEffect(() => {
    const handleUnauthorized = async () => {
      try {
        sessionStorage.setItem('unix_session_expired', '1');
      } catch {
        // ignore storage errors
      }
      await forcedLogout();
    };

    window.addEventListener('unix:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('unix:unauthorized', handleUnauthorized);
    };
  }, [forcedLogout]);

  // 1. Password Login (Returning Users)
  const login = async (rollNumber, password) => {
    resetUnauthorizedGuard();
    const res = await api.post('/api/auth/login', {
      rollNumber,
      password,
    });
    if (res.data?.success && res.data?.data) {
      const userData = res.data.data;
      if (userData.token) {
        localStorage.setItem('unix_token', userData.token);
      }
      setUser(userData);
      trackEvent('login', { method: 'password' });
    }
    return res.data;
  };

  // 2. Registration Step 1: Request OTP
  const registerRequestOtp = async (rollNumber, email, fullName) => {
    const res = await api.post('/api/auth/register/request-otp', {
      rollNumber,
      email,
      fullName,
    });
    return res.data;
  };

  // 3. Registration Step 2: Verify OTP
  const registerVerifyOtp = async (email, otp) => {
    const res = await api.post('/api/auth/register/verify-otp', {
      email,
      otp,
    });
    return res.data;
  };

  // 4. Registration Step 3: Confirm OTP & Set Password
  const registerConfirm = async (rollNumber, email, fullName, otp, rawPassword) => {
    resetUnauthorizedGuard();
    const res = await api.post('/api/auth/register/confirm', {
      rollNumber,
      email,
      fullName,
      otp,
      rawPassword,
    });
    if (res.data?.success && res.data?.data) {
      const userData = res.data.data;
      if (userData.token) {
        localStorage.setItem('unix_token', userData.token);
      }
      setUser(userData);
      trackEvent('sign_up', { method: 'email_otp' });
    }
    return res.data;
  };

  // 5. Logout
  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      await forcedLogout();
    }
  };

  // 6. Update WhatsApp Phone Number
  const updateUserPhone = async (phone) => {
    const res = await api.put('/api/users/me/phone', { phone });
    if (res.data?.success && res.data?.data) {
      const updatedUser = res.data.data;
      setUser((prev) => (prev ? { ...prev, ...updatedUser } : updatedUser));
    }
    return res.data;
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    checkAuth,
    login,
    registerRequestOtp,
    registerVerifyOtp,
    registerConfirm,
    updateUserPhone,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
