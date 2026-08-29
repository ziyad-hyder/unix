import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Hydrate auth state by calling /api/auth/me
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/auth/me');
      if (res.data?.success && res.data?.data) {
        setUser(res.data.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // 1. Password Login (Returning Users)
  const login = async (rollNumber, password) => {
    const res = await api.post('/api/auth/login', {
      rollNumber,
      password,
    });
    if (res.data?.success && res.data?.data) {
      setUser(res.data.data);
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
    const res = await api.post('/api/auth/register/confirm', {
      rollNumber,
      email,
      fullName,
      otp,
      rawPassword,
    });
    if (res.data?.success && res.data?.data) {
      setUser(res.data.data);
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
      setUser(null);
    }
  };

  // 6. Update WhatsApp Phone Number
  const updateUserPhone = async (phone) => {
    const res = await api.put('/api/users/me/phone', { phone });
    if (res.data?.success && res.data?.data) {
      setUser(res.data.data);
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
