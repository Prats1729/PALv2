import React, { createContext, useState, useEffect, useContext } from 'react';
import { apiFetch } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    
    // Validate session token with backend
    if (token) {
      if (token === "guest-mode-token") {
        try {
          const storedUser = JSON.parse(localStorage.getItem('user'));
          if (isTauri && storedUser?.isGuest) {
            logout();
          } else {
            setUser(storedUser);
          }
        } catch {
          logout();
        }
        setLoading(false);
        return;
      }

      // Verify token with backend to ensure user still exists in database
      apiFetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error("Session expired or user deleted");
          }
          return res.json();
        })
        .then((data) => {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        })
        .catch(() => {
          logout();
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (identifier, password) => {
    const response = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, username: identifier, password })
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  };

  const register = async (username, email, password) => {
    const response = await apiFetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  };

  const loginWithAniList = async (anilistToken) => {
    const response = await apiFetch('/api/auth/anilist-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anilistToken })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  };

  const forgotPassword = async (email) => {
    const response = await apiFetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
  };

  const resetPassword = async (token, newPassword) => {
    const response = await apiFetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
  };

  const continueAsGuest = () => {
    const guestUser = { username: "Guest", isGuest: true, _id: "guest-user" };
    setUser(guestUser);
    setToken("guest-mode-token");
    localStorage.setItem('user', JSON.stringify(guestUser));
    localStorage.setItem('token', 'guest-mode-token');
  };

  const deleteAccount = async () => {
    const response = await apiFetch('/api/auth/account', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to delete account');
    logout();
    return data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      login, 
      register, 
      loginWithAniList, 
      forgotPassword, 
      resetPassword, 
      deleteAccount,
      logout, 
      continueAsGuest, 
      setUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
