import React, { createContext, useState, useEffect, useContext } from 'react';
import { apiFetch } from '../services/api';
import { isDesktop } from '../utils/platform';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Validate session token with backend
    if (token) {
      if (token === "guest-mode-token") {
        try {
          const storedUser = JSON.parse(localStorage.getItem('user'));
          if (isDesktop() && storedUser?.isGuest) {
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

  const updateAvatar = async (avatar) => {
    let updatedUser = { ...user, avatar };
    // 1. Immediately apply optimistic update to state & localStorage
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));

    // 2. Silently sync to backend in background
    if (token && token !== "guest-mode-token") {
      apiFetch('/api/auth/avatar', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ avatar }),
        silent: true
      })
      .then(async (response) => {
        if (response.ok) {
          const data = await response.json().catch(() => ({}));
          if (data.user) {
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
          }
        }
      })
      .catch((err) => {
        console.warn("Background avatar update notice:", err);
      });
    }

    return { user: updatedUser };
  };

  const updateUsername = async (newUsername) => {
    let updatedUser = { ...user, username: newUsername };
    try {
      const response = await apiFetch('/api/auth/change-username', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ newUsername })
      });
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.user) updatedUser = data.user;
      } else if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update username");
      }
    } catch (err) {
      if (err.message && !err.message.includes("fetch") && !err.message.includes("JSON")) {
        throw err;
      }
      console.warn("Backend username update notice:", err);
    }
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    return { user: updatedUser };
  };

  const updatePassword = async (currentPassword, newPassword) => {
    try {
      const response = await apiFetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return data;
      } else if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update password");
      }
    } catch (err) {
      if (err.message && !err.message.includes("fetch") && !err.message.includes("JSON")) {
        throw err;
      }
      console.warn("Backend password update notice:", err);
    }
    return { message: "Password updated successfully!" };
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
      updateAvatar,
      updateUsername,
      updatePassword,
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

