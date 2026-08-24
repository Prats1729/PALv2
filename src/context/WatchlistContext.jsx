import React, { createContext, useState, useEffect, useContext } from 'react';

// 1. Create the Context (The empty box)
const WatchlistContext = createContext();

// 2. Create the Provider (The component that fills the box and shares it)
export function WatchlistProvider({ children }) {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);

  // When the app starts, fetch our list from the backend!
  useEffect(() => {
    fetchWatchlist();
  }, []);

  // Function to ask the backend for the latest watchlist
  const fetchWatchlist = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/watchlist');
      const data = await response.json();
      setWatchlist(data); // Save it to React State
    } catch (error) {
      console.error("Failed to fetch watchlist from backend", error);
    } finally {
      setLoading(false);
    }
  };

  // Function to add a new anime to the backend
  const addToWatchlist = async (anime) => {
    try {
      const response = await fetch('http://localhost:5000/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: anime.id,
          title: anime.title?.userPreferred || anime.title?.english || anime.title?.romaji || "Unknown",
          status: "Plan to Watch"
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

  return (
    <WatchlistContext.Provider value={{ watchlist, loading, addToWatchlist, fetchWatchlist }}>
      {children}
    </WatchlistContext.Provider>
  );
}

// 3. Create a custom Hook (A shortcut to open the box from any component)
export function useWatchlist() {
  return useContext(WatchlistContext);
}
