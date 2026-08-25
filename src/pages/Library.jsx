import { useState } from "react";
import { Link } from "react-router-dom";
import { useWatchlist } from "../context/WatchlistContext";
import Pagination from "../components/common/Pagination";
import "../styles/Library.css";

export default function Library() {
  const { watchlist, updateWatchlistItem, removeFromWatchlist, loading } = useWatchlist();
  const [activeTab, setActiveTab] = useState("ALL");
  const [activeMenuId, setActiveMenuId] = useState(null);
  
  const ITEMS_PER_PAGE = 25;
  const [page, setPage] = useState(1);

  // Filter the backend watchlist based on the active tab
  let entries = [];
  if (activeTab === "ALL") {
    entries = watchlist;
  } else {
    // Our backend status strings match exactly: "Watching", "Completed", "Plan to Watch", "Dropped"
    entries = watchlist.filter((item) => item.status === activeTab);
  }

  const totalPages = Math.ceil(entries.length / ITEMS_PER_PAGE);
  const paginatedEntries = entries.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className="library-container">
      <h2 className="library-title">My PAL Watchlist</h2>
      <p className="library-subtitle">
        Your personal, persistent anime list stored safely in MongoDB.
      </p>

      {/* Status Filter Tabs */}
      <div className="library-tabs">
        {[
          { label: "All Anime", key: "ALL" },
          { label: "Watching", key: "Watching" },
          { label: "Completed", key: "Completed" },
          { label: "Plan to Watch", key: "Plan to Watch" },
          { label: "Dropped", key: "Dropped" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setPage(1);
            }}
            className={`library-tab-btn ${activeTab === tab.key ? "active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {!loading && entries.length > 0 && (
        <p style={{ color: "#aaa", marginBottom: "15px", marginTop: "-5px" }}>
          Found {entries.length} anime in this category
        </p>
      )}

      {/* Main Page Style Anime Card Grid */}
      {loading ? (
        <div className="anime-grid" style={{ padding: 0 }}>
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="skeleton-card" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="library-content-card">
          <p className="library-empty-text">No anime found in this category.</p>
        </div>
      ) : (
        <div className="anime-grid" style={{ padding: 0 }}>
          {paginatedEntries.map((anime) => {
            return (
              <Link
                key={anime._id}
                to={`/anime/${anime.animeId}`}
                className="card-link"
                style={{ "--hover-color": anime.color || "#6366f1" }}
              >
                <div className="anime-card">
                  <img
                    src={anime.coverImage}
                    alt={anime.title}
                    loading="lazy"
                  />
                  
                  {activeMenuId !== anime.animeId && (
                    <div className="quick-add-container">
                      <button 
                        className="quick-add-trigger"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setActiveMenuId(anime.animeId);
                        }}
                        title="Change Status"
                      >
                        {anime.status} ▼
                      </button>
                    </div>
                  )}
                  
                  {activeMenuId === anime.animeId && (
                    <div 
                      className="quick-add-menu" 
                      onMouseLeave={() => setActiveMenuId(null)}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    >
                      {["Watching", "Plan to Watch", "Completed", "Dropped"].map(status => (
                        <button
                          key={status}
                          className="quick-add-option"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            updateWatchlistItem(anime.animeId, { status });
                            setActiveMenuId(null);
                          }}
                        >
                          {status}
                        </button>
                      ))}
                      <button
                        className="quick-add-option"
                        style={{ color: "#f87171", borderTop: "1px solid rgba(239, 68, 68, 0.2)" }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeFromWatchlist(anime.animeId);
                          setActiveMenuId(null);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  <div className="anime-info" style={{ height: "85px", justifyContent: "flex-start" }}>
                    <div className="anime-title" title={anime.title}>
                      {anime.title}
                    </div>
                    <div className="anime-meta" style={{ color: "#6366f1" }}>
                      <span>Progress: {anime.progress} / {anime.totalEpisodes || "?"}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
