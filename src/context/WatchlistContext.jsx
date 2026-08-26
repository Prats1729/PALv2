import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { syncToAniList, deleteFromAniList } from '../services/anilistSync';

const WatchlistContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function WatchlistProvider({ children }) {
  const { token, user } = useAuth();
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const anilistTokenRef = useRef(null);

  const fetchWatchlist = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/watchlist`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setWatchlist(data);
      }
    } catch (error) {
      console.error("Failed to fetch watchlist from backend", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch AniList token once on login (cached in ref to avoid re-renders)
  useEffect(() => {
    if (token && user?.hasAnilistToken) {
      fetch(`${API_URL}/api/auth/anilist-token`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => { 
          anilistTokenRef.current = data.anilistToken; 
          // Silently trigger two-way sync in the background
          if (data.anilistToken) {
            fetch(`${API_URL}/api/watchlist/import-anilist`, {
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
        })
        .catch(() => { anilistTokenRef.current = null; });
    } else {
      anilistTokenRef.current = null;
    }
  }, [token, user?.hasAnilistToken, fetchWatchlist]);

  useEffect(() => {
    if (token && user) {
      fetchWatchlist();
    } else if (!token) {
      setWatchlist([]);
      setLoading(false);
    }
  }, [token, user, fetchWatchlist]);

  const addToWatchlist = async (anime, status = "Plan to Watch") => {
    if (!token) return;
    try {
      const progress = status === "Completed" ? (anime.episodes || 0) : 0;
      const rating = anime.averageScore ? (anime.averageScore / 10) : null;

      const response = await fetch(`${API_URL}/api/watchlist`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          id: anime.id,
          title: anime.title?.userPreferred || anime.title?.english || anime.title?.romaji || "Unknown",
          coverImage: anime.coverImage?.large || anime.coverImage?.medium || "",
          color: anime.coverImage?.color || "#6366f1",
          totalEpisodes: anime.episodes || null,
          status,
          progress,
          rating
        })
      });

      if (response.ok) {
        const result = await response.json();
        // Optimistically add to state to avoid DB race condition and extra network request
        if (result.anime) {
          setWatchlist(prev => [...prev, result.anime]);
        } else {
          fetchWatchlist(); // Fallback
        }

        window.dispatchEvent(new CustomEvent("pal-toast", { 
          detail: { message: "Added to Watchlist!", type: "success" } 
        }));

        // Background sync to AniList
        if (anilistTokenRef.current) {
          syncToAniList(anilistTokenRef.current, anime.id, status, progress, rating);
        }
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

  const updateWatchlistItem = async (id, updates) => {
    if (!token) return;
    try {
      // Auto-fill progress if status is set to Completed
      if (updates.status === "Completed") {
        const item = watchlist.find(w => w.animeId === id || w._id === id);
        if (item && item.totalEpisodes) {
          updates.progress = item.totalEpisodes;
        }
      }

      const response = await fetch(`${API_URL}/api/watchlist/${id}`, {
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
          setWatchlist(prev => prev.map(item => item.animeId === id ? { ...item, ...data.anime } : item));
        } else {
          fetchWatchlist();
        }

        // Background sync to AniList
        if (anilistTokenRef.current && data.anime) {
          const anime = data.anime;
          syncToAniList(
            anilistTokenRef.current,
            anime.animeId,
            anime.status,
            anime.progress,
            anime.rating
          );
        }
      } else {
        const errorData = await response.json();
        window.dispatchEvent(new CustomEvent("pal-toast", { 
          detail: { message: errorData.error || "Failed to update", type: "error" } 
        }));
      }
    } catch (error) {
      console.error("Error updating watchlist item", error);
    }
  };

  const removeFromWatchlist = async (id) => {
    if (!token) return;

    // Grab animeId before deleting (for AniList sync)
    const item = watchlist.find(w => w.animeId === id);
    const animeId = item?.animeId || id;

    try {
      const response = await fetch(`${API_URL}/api/watchlist/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setWatchlist(prev => prev.filter(w => w.animeId !== animeId));
        window.dispatchEvent(new CustomEvent("pal-toast", { 
          detail: { message: "Removed from Watchlist", type: "info" } 
        }));

        // Background sync: remove from AniList too
        if (anilistTokenRef.current) {
          deleteFromAniList(anilistTokenRef.current, animeId);
        }
      } else {
        const errorData = await response.json();
        window.dispatchEvent(new CustomEvent("pal-toast", { 
          detail: { message: errorData.error || "Failed to delete", type: "error" } 
        }));
      }
    } catch (error) {
      console.error("Error removing from watchlist", error);
    }
  };

  return (
    <WatchlistContext.Provider value={{ 
      watchlist, 
      loading, 
      addToWatchlist, 
      fetchWatchlist,
      updateWatchlistItem,
      removeFromWatchlist
    }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  return useContext(WatchlistContext);
}
