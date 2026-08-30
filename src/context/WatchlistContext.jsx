import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { syncToAniList, deleteFromAniList } from '../services/anilistSync';
import { apiFetch } from '../services/api';

const WatchlistContext = createContext();

export function WatchlistProvider({ children }) {
  const { token, user, logout } = useAuth();
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const anilistTokenRef = useRef(null);

  const fetchWatchlist = useCallback(async () => {
    if (!token) return;
    if (user?.isGuest) {
      try {
        const localData = JSON.parse(localStorage.getItem('pal_guest_watchlist') || '[]');
        setWatchlist(localData);
      } catch {
        setWatchlist([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      const response = await apiFetch('/api/watchlist', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.status === 401) {
        logout();
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setWatchlist(data);
      }
    } catch (error) {
      console.error("Failed to fetch watchlist from backend", error);
    } finally {
      setLoading(false);
    }
  }, [token, user?.isGuest, logout]);

  // Helper to get AniList token (cached or fetched on demand)
  const getAnilistToken = useCallback(async () => {
    if (anilistTokenRef.current) return anilistTokenRef.current;
    if (!token || !user?.hasAnilistToken || user?.isGuest) return null;
    try {
      const res = await apiFetch('/api/auth/anilist-token', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.anilistToken) {
          anilistTokenRef.current = data.anilistToken;
          return data.anilistToken;
        }
      }
    } catch (e) {
      console.error("[WatchlistContext] Failed to get AniList token:", e);
    }
    return null;
  }, [token, user?.hasAnilistToken, user?.isGuest]);

  // Fetch AniList token once on login (cached in ref to avoid re-renders)
  useEffect(() => {
    if (token && user?.hasAnilistToken && !user?.isGuest) {
      getAnilistToken().then(anilistToken => {
        if (anilistToken) {
          // Silently trigger two-way sync in the background
          apiFetch('/api/watchlist/import-anilist', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          })
          .then(res => res.json())
          .then(syncData => {
            console.log("Background sync complete:", syncData.message);
            fetchWatchlist(); // Refresh local list after sync
          })
          .catch(err => console.error("Background sync failed", err));
        }
      });
    } else {
      anilistTokenRef.current = null;
    }
  }, [token, user?.hasAnilistToken, user?.isGuest, fetchWatchlist, getAnilistToken]);

  useEffect(() => {
    if (token && user) {
      fetchWatchlist();
    } else if (!token) {
      setWatchlist([]);
      setLoading(false);
    }
  }, [token, user, fetchWatchlist]);

  const touchWatchHistory = (animeId) => {
    // Deprecated: Recency is now managed via persistent MongoDB lastWatchedAt
  };

  const addToWatchlist = async (anime, status = "Plan to Watch", lastWatchedAt = null) => {
    if (user?.isGuest) {
      window.dispatchEvent(new CustomEvent("pal-auth-prompt", {
        detail: {
          message: `Sign in or create a free account to add "${anime.title?.userPreferred || anime.title?.english || anime.title?.romaji || anime.title || 'this anime'}" to your watchlist.`
        }
      }));
      return;
    }

    if (!token) return;

    const progress = status === "Completed" ? (anime.episodes || 0) : 0;
    const rating = anime.averageScore ? (anime.averageScore / 10) : null;

    try {
      const response = await apiFetch('/api/watchlist', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          id: anime.id,
          title: anime.title?.userPreferred || anime.title?.english || anime.title?.romaji || "Unknown",
          coverImage: anime.coverImage?.large || anime.coverImage?.medium || "",
          bannerImage: anime.bannerImage || null,
          color: anime.coverImage?.color || "#6366f1",
          totalEpisodes: anime.episodes || null,
          status,
          progress,
          rating,
          lastWatchedAt: lastWatchedAt || null
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.anime) {
          setWatchlist(prev => [...prev, result.anime]);
        } else {
          fetchWatchlist();
        }

        window.dispatchEvent(new CustomEvent("pal-toast", { 
          detail: { message: "Added to Watchlist!", type: "success" } 
        }));

        // Background sync to AniList
        getAnilistToken().then(aToken => {
          if (aToken) {
            syncToAniList(aToken, anime.id, status, progress, rating);
          }
        });
      } else {
        const errorData = await response.json();
        window.dispatchEvent(new CustomEvent("pal-toast", { 
          detail: { message: errorData.error, type: "error" } 
        }));
      }
    } catch (error) {
      console.error("Error adding to watchlist", error);
    }
  };

  const isMatch = (item, targetId) => {
    if (!item || targetId == null) return false;
    return item._id === targetId || item.animeId === targetId || String(item.animeId) === String(targetId);
  };

  const updateWatchlistItem = async (id, updates) => {
    if (!token && !user?.isGuest) return;

    // Auto-fill progress if status is set to Completed
    if (updates.status === "Completed") {
      const item = watchlist.find(w => isMatch(w, id));
      if (item && item.totalEpisodes) {
        updates.progress = item.totalEpisodes;
      }
    }

    if (user?.isGuest) {
      const current = JSON.parse(localStorage.getItem('pal_guest_watchlist') || '[]');
      const updated = current.map(item => isMatch(item, id) ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item);
      localStorage.setItem('pal_guest_watchlist', JSON.stringify(updated));
      setWatchlist(updated);
      return;
    }

    // Optimistically update local state for instantaneous responsiveness
    setWatchlist(prev => prev.map(item => isMatch(item, id) ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item));

    try {
      const response = await apiFetch(`/api/watchlist/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.anime) {
          setWatchlist(prev => prev.map(item => isMatch(item, id) ? { ...item, ...data.anime } : item));
        }

        // Background sync to AniList
        getAnilistToken().then(aToken => {
          if (aToken && data.anime) {
            const anime = data.anime;
            syncToAniList(
              aToken,
              anime.animeId,
              anime.status,
              anime.progress,
              anime.rating
            );
          }
        });
      } else {
        fetchWatchlist();
        const errorData = await response.json().catch(() => ({}));
        window.dispatchEvent(new CustomEvent("pal-toast", { 
          detail: { message: errorData.error || "Failed to update", type: "error" } 
        }));
      }
    } catch (error) {
      console.error("Error updating watchlist item", error);
      fetchWatchlist();
    }
  };

  const removeFromWatchlist = async (id) => {
    if (!token) return;

    // Grab animeId before deleting (for AniList sync)
    const item = watchlist.find(w => isMatch(w, id));
    const animeId = item?.animeId || id;

    if (user?.isGuest) {
      const current = JSON.parse(localStorage.getItem('pal_guest_watchlist') || '[]');
      const updated = current.filter(w => !isMatch(w, id));
      localStorage.setItem('pal_guest_watchlist', JSON.stringify(updated));
      setWatchlist(updated);
      window.dispatchEvent(new CustomEvent("pal-toast", { 
        detail: { message: "Removed from Watchlist", type: "info" } 
      }));
      return;
    }

    // Optimistically remove from state
    const previousWatchlist = [...watchlist];
    setWatchlist(prev => prev.filter(w => !isMatch(w, id)));

    try {
      const response = await apiFetch(`/api/watchlist/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        window.dispatchEvent(new CustomEvent("pal-toast", { 
          detail: { message: "Removed from Watchlist", type: "info" } 
        }));

        // Background sync: remove from AniList too
        getAnilistToken().then(aToken => {
          if (aToken) {
            deleteFromAniList(aToken, animeId);
          }
        });
      } else {
        setWatchlist(previousWatchlist);
        const errorData = await response.json().catch(() => ({}));
        window.dispatchEvent(new CustomEvent("pal-toast", { 
          detail: { message: errorData.error || "Failed to delete", type: "error" } 
        }));
      }
    } catch (error) {
      console.error("Error removing from watchlist", error);
      setWatchlist(previousWatchlist);
    }
  };

  return (
    <WatchlistContext.Provider value={{ 
      watchlist, 
      loading, 
      addToWatchlist, 
      fetchWatchlist,
      updateWatchlistItem,
      removeFromWatchlist,
      touchWatchHistory
    }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  return useContext(WatchlistContext);
}
