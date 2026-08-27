import { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useWatchlist } from "../context/WatchlistContext";
import { useAuth } from "../context/AuthContext";
import Pagination from "../components/common/Pagination";
import "../styles/Library.css";

const SORT_OPTIONS = [
  { value: "recent", label: "Recently Watched / Updated" },
  { value: "title_asc", label: "Title: A to Z" },
  { value: "title_desc", label: "Title: Z to A" },
  { value: "score_desc", label: "Rating: High to Low" },
  { value: "progress_desc", label: "Progress: Most Watched" },
  { value: "progress_asc", label: "Progress: Least Watched" },
];

function LibrarySortDropdown({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentOption = SORT_OPTIONS.find((o) => o.value === value) || SORT_OPTIONS[0];

  return (
    <div className="library-custom-dropdown" ref={ref}>
      <button
        type="button"
        className={`library-dropdown-trigger ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="library-dropdown-label">Sort:</span>
        <span className="library-dropdown-value">{currentOption.label}</span>
        <span className="library-chevron-arrow"></span>
      </button>

      {isOpen && (
        <div className="library-dropdown-list">
          {SORT_OPTIONS.map((opt) => (
            <div
              key={opt.value}
              className={`library-dropdown-item ${opt.value === value ? "active" : ""}`}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
            >
              <span>{opt.label}</span>
              {opt.value === value && <span className="library-dropdown-check">✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Library() {
  const { watchlist, updateWatchlistItem, removeFromWatchlist, loading } = useWatchlist();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [activeMenuId, setActiveMenuId] = useState(null);
  
  const ITEMS_PER_PAGE = 24;
  const [page, setPage] = useState(1);

  // Filter and Sort entries
  const filteredEntries = useMemo(() => {
    let list = [...watchlist];

    // 1. Status Tab Filter
    if (activeTab !== "ALL") {
      list = list.filter((item) => item.status === activeTab);
    }

    // 2. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((item) => (item.title || "").toLowerCase().includes(q));
    }

    // 3. Sorting
    list.sort((a, b) => {
      if (sortBy === "title_asc") {
        return (a.title || "").localeCompare(b.title || "");
      }
      if (sortBy === "title_desc") {
        return (b.title || "").localeCompare(a.title || "");
      }
      if (sortBy === "score_desc") {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (sortBy === "progress_desc") {
        return (b.progress || 0) - (a.progress || 0);
      }
      if (sortBy === "progress_asc") {
        return (a.progress || 0) - (b.progress || 0);
      }
      // Default: "recent"
      const timeA = a.lastWatchedAt ? new Date(a.lastWatchedAt).getTime() : (a.updatedAt ? new Date(a.updatedAt).getTime() : 0);
      const timeB = b.lastWatchedAt ? new Date(b.lastWatchedAt).getTime() : (b.updatedAt ? new Date(b.updatedAt).getTime() : 0);
      return timeB - timeA;
    });

    return list;
  }, [watchlist, activeTab, searchQuery, sortBy]);

  const totalPages = Math.ceil(filteredEntries.length / ITEMS_PER_PAGE);
  const paginatedEntries = filteredEntries.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo(0, 0);
    }
  };

  const handleResetFilters = () => {
    setActiveTab("ALL");
    setSearchQuery("");
    setSortBy("recent");
    setPage(1);
  };

  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  if (!isTauri && user?.isGuest) {
    return (
      <div className="library-container" style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ marginBottom: "16px", color: "#6366f1" }}>
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h2 style={{ color: "#ffffff", fontSize: "24px", fontWeight: "700", margin: "0 0 10px 0" }}>
          Library is Locked in Guest Mode
        </h2>
        <p style={{ color: "#94a3b8", fontSize: "14px", maxWidth: "460px", margin: "0 auto 24px auto", lineHeight: "1.6" }}>
          Sign in or create a free PAL account to build your personal watchlist, track episode progress, and sync with AniList.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", maxWidth: "300px", margin: "0 auto" }}>
          <Link
            to="/login"
            style={{
              flex: 1,
              backgroundColor: "#6366f1",
              color: "#fff",
              padding: "10px 18px",
              borderRadius: "6px",
              textDecoration: "none",
              fontWeight: "600",
              fontSize: "14px",
              textAlign: "center"
            }}
          >
            Sign In
          </Link>
          <Link
            to="/register"
            style={{
              flex: 1,
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#e2e8f0",
              padding: "10px 18px",
              borderRadius: "6px",
              textDecoration: "none",
              fontWeight: "600",
              fontSize: "14px",
              textAlign: "center"
            }}
          >
            Sign Up
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="library-container">
      <div className="library-header-row">
        <div>
          <h2 className="library-title">
            My PAL Watchlist
          </h2>
          <p className="library-subtitle">
            Your personal, persistent anime list stored safely in MongoDB.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar Controls */}
      <div className="library-controls-bar">
        <div className="library-search-input-wrap">
          <input
            type="text"
            placeholder="Search your library..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="library-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="library-search-clear"
            >
              ✕
            </button>
          )}
        </div>

        <LibrarySortDropdown
          value={sortBy}
          onChange={(val) => {
            setSortBy(val);
            setPage(1);
          }}
        />

        {(searchQuery || sortBy !== "recent" || activeTab !== "ALL") && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="library-reset-btn"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Status Filter Tabs */}
      <div className="library-tabs">
        {[
          { label: "All Anime", key: "ALL" },
          { label: "Watching", key: "Watching" },
          { label: "Completed", key: "Completed" },
          { label: "On Hold", key: "On Hold" },
          { label: "Plan to Watch", key: "Plan to Watch" },
          { label: "Dropped", key: "Dropped" },
        ].map((tab) => {
          const count = tab.key === "ALL" 
            ? watchlist.length 
            : watchlist.filter(w => w.status === tab.key).length;

          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setPage(1);
              }}
              className={`library-tab-btn ${activeTab === tab.key ? "active" : ""}`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {!loading && filteredEntries.length > 0 && (
        <p style={{ color: "#aaa", marginBottom: "15px", fontSize: "13px" }}>
          Showing {filteredEntries.length} {filteredEntries.length === 1 ? "title" : "titles"}
        </p>
      )}

      {/* Main Page Style Anime Card Grid */}
      {loading ? (
        <div className="anime-grid" style={{ padding: 0 }}>
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="skeleton-card" />
          ))}
        </div>
      ) : filteredEntries.length === 0 ? (
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
                className={`card-link ${activeMenuId === anime.animeId ? "dropdown-open" : ""}`}
                style={{ 
                  "--hover-color": anime.color || "#6366f1",
                  zIndex: activeMenuId === anime.animeId ? 200 : "auto"
                }}
              >
                <div className={`anime-card ${activeMenuId === anime.animeId ? "dropdown-open" : ""}`}>
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
                      {["Watching", "Plan to Watch", "Completed", "On Hold", "Dropped"].map(status => (
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
