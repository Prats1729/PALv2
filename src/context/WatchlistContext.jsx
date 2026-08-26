import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useAuth } from './AuthContext';

// 1. Create the Context (The empty box)
const WatchlistContext = createContext();

// 2. Create the Provider (The component that fills the box and shares it)
export function WatchlistProvider({ children }) {
  const { token, user } = useAuth();
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);

  // When the app starts, fetch our list from the backend!
  useEffect(() => {
    if (token && user) {
      fetchWatchlist();
    } else if (!token) {
      setWatchlist([]);
      setLoading(false);
    }
  }, [token, user]);

  // Function to ask the backend for the latest watchlist
  const fetchWatchlist = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/watchlist', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setWatchlist(data); // Save it to React State
    } catch (error) {
      console.error("Failed to fetch watchlist from backend", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Function to add a new anime to the backend
  const addToWatchlist = async (anime, status = "Plan to Watch") => {
    if (!token) return;
    try {
      const response = await fetch('http://localhost:5000/api/watchlist', {
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
          status: status,
          progress: status === "Completed" ? (anime.episodes || 0) : 0,
          rating: anime.averageScore ? (anime.averageScore / 10) : null
        })
      });

      if (response.ok) {
        // If the backend saved it successfully, refresh our React state!
        fetchWatchlist();
        
        // Use our existing toast system
        window.dispatchEvent(new CustomEvent("pal-toast", { 
          detail: { message: "Added to PAL Backend!", type: "success" } 
        }));
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

      const response = await fetch(`http://localhost:5000/api/watchlist/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(updates)
      });
      if (response.ok) {
        fetchWatchlist(); // Refresh to show the updated data
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

  // Function to remove an anime from the backend
  const removeFromWatchlist = async (id) => {
    if (!token) return;
    try {
      const response = await fetch(`http://localhost:5000/api/watchlist/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        fetchWatchlist(); // Refresh to remove it from the UI
        window.dispatchEvent(new CustomEvent("pal-toast", { 
          detail: { message: "Removed from Watchlist", type: "info" } 
        }));
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

// 3. Create a custom Hook (A shortcut to open the box from any component)
export function useWatchlist() {
  return useContext(WatchlistContext);
}
