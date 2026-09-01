import { useState, useMemo, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useWatchlist } from "../context/WatchlistContext";
import { useAuth } from "../context/AuthContext";
import Pagination from "../components/common/Pagination";
import { fetchAnimeBrief } from "../services/anilist";
import star from "../assets/star.png";
import "../styles/Library.css";

const SORT_OPTIONS = [
  { value: "added_desc", label: "Recently Added" },
  { value: "watched_desc", label: "Recently Watched" },
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

// Reusable Library Anime Card with Hover Preview & Description
function LibraryCard({ anime, activeMenuId, setActiveMenuId, updateWatchlistItem, removeFromWatchlist }) {
  const [showPreview, setShowPreview] = useState(false);
  const [hoverPosition, setHoverPosition] = useState("right");
  const [briefData, setBriefData] = useState(null);
  const hoverTimer = useRef(null);

  const handleMouseEnter = (e) => {
    if (activeMenuId === anime.animeId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.right + 285 > window.innerWidth) {
      setHoverPosition("left");
    } else {
      setHoverPosition("right");
    }

    hoverTimer.current = setTimeout(() => {
      setShowPreview(true);
      // Fetch only after cursor rests for 400ms to avoid burst requests
      fetchAnimeBrief(anime.animeId).then((data) => {
        if (data) setBriefData(data);
      });
    }, 400);
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setShowPreview(false);
  };

  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    };
  }, []);

  const isMenuOpen = activeMenuId === anime.animeId;
  const progressPercent = anime.totalEpisodes ? Math.min(100, Math.round((anime.progress / anime.totalEpisodes) * 100)) : null;

  const cleanDescription = briefData?.description
    ? briefData.description.replace(/<[^>]*>/g, "").substring(0, 130) + "..."
    : (anime.description ? anime.description.replace(/<[^>]*>/g, "").substring(0, 130) + "..." : null);

  const displayGenres = (briefData?.genres || anime.genres || []).slice(0, 3);

  return (
    <div
      className={`anime-card-wrapper ${isMenuOpen ? "dropdown-open" : ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: "relative",
        zIndex: isMenuOpen ? 9999 : (showPreview ? 50 : 1)
      }}
    >
      <Link
        to={`/anime/${anime.animeId}`}
        className={`card-link ${isMenuOpen ? "dropdown-open" : ""}`}
        style={{ 
          "--hover-color": anime.color || "#6366f1",
          position: "relative",
          zIndex: isMenuOpen ? 9999 : 1
        }}
      >
        <div className={`anime-card ${isMenuOpen ? "dropdown-open" : ""}`}>
          <img
            src={anime.coverImage}
            alt={anime.title}
            loading="lazy"
          />
          
          {!isMenuOpen && (
            <div className="quick-add-container">
              <button 
                className="quick-add-trigger"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowPreview(false);
                  setActiveMenuId(anime.animeId);
                }}
                title="Change Status"
              >
                {anime.status} ▼
              </button>
            </div>
          )}
          
          {isMenuOpen && (
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
            <div className="anime-meta" style={{ color: "var(--accent-primary, #6366f1)" }}>
              <span>Progress: {anime.progress} / {anime.totalEpisodes || "?"}</span>
            </div>
          </div>
        </div>
      </Link>

      {/* Floating Hover Details Preview Card */}
      {showPreview && !isMenuOpen && (
        <div
          className={`card-hover-preview pos-${hoverPosition}`}
          style={{ 
            borderTop: `3px solid ${anime.color || "var(--accent-primary, #6366f1)"}`,
            left: hoverPosition === "right" ? "105%" : "auto",
            right: hoverPosition === "left" ? "105%" : "auto"
          }}
        >
          <div className="hover-preview-header">
            <h3>{anime.title}</h3>
            <div className="hover-badges-row">
              <span className="hover-format">{briefData?.format || "TV"}</span>
              <span className="hover-status" style={{ backgroundColor: "rgba(99, 102, 241, 0.2)", color: "#818cf8", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600" }}>
                {anime.status}
              </span>
            </div>
          </div>
          <div className="hover-preview-meta">
            <span className="hover-rating">
              <img src={star} alt="star" /> {anime.rating ? `${anime.rating}/10` : "No rating"}
            </span>
            <span>•</span>
            <span>Progress: {anime.progress}/{anime.totalEpisodes || "?"}</span>
            {progressPercent !== null && (
              <>
                <span>•</span>
                <span className="hover-status">{progressPercent}%</span>
              </>
            )}
          </div>

          {displayGenres.length > 0 && (
            <div className="hover-tags-container" style={{ marginTop: '6px', marginBottom: '6px' }}>
              {displayGenres.map((genre) => (
                <span key={genre} className="hover-chip hover-genre-chip">
                  {genre}
                </span>
              ))}
            </div>
          )}

          {cleanDescription && (
            <p className="hover-preview-desc" style={{ margin: "6px 0 0 0", fontSize: "12px", lineHeight: "1.4", color: "var(--text-secondary, #94a3b8)" }}>
              {cleanDescription}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Library() {
  const { watchlist, updateWatchlistItem, removeFromWatchlist, loading } = useWatchlist();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read URL search params for back-button / bookmark persistence
  const activeTab = searchParams.get("status") || "ALL";
  const searchQuery = searchParams.get("q") || "";
  const sortBy = searchParams.get("sort") || "added_desc";
  const page = parseInt(searchParams.get("page"), 10) || 1;

  const [activeMenuId, setActiveMenuId] = useState(null);
  const ITEMS_PER_PAGE = 24;

  const updateUrlParams = (newParams) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([k, v]) => {
      if (
        v === null ||
        v === undefined ||
        v === "" ||
        (k === "status" && v === "ALL") ||
        (k === "sort" && (v === "added_desc" || v === "recent")) ||
        (k === "page" && v === 1)
      ) {
        next.delete(k);
      } else {
        next.set(k, String(v));
      }
    });
    setSearchParams(next, { replace: true });
  };

  // Filter and Sort entries with exact status matching
  const filteredEntries = useMemo(() => {
    let list = [...watchlist];

    // 1. Status Tab Filter (uses exact item.status)
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
      if (sortBy === "watched_desc") {
        const timeA = a.lastWatchedAt ? new Date(a.lastWatchedAt).getTime() : 0;
        const timeB = b.lastWatchedAt ? new Date(b.lastWatchedAt).getTime() : 0;
        if (timeA !== timeB) return timeB - timeA;
        return Number(b.animeId || 0) - Number(a.animeId || 0);
      }

      // Default: "added_desc" / "recent" -> Sort by actual time added, falling back to release recency
      const getAddedTime = (item) => {
        if (item.addedAt) {
          const t = new Date(item.addedAt).getTime();
          if (!isNaN(t) && t > 0) return t;
        }
        if (item.createdAt) {
          const t = new Date(item.createdAt).getTime();
          if (!isNaN(t) && t > 0) return t;
        }
        return 0;
      };

      const timeA = getAddedTime(a);
      const timeB = getAddedTime(b);

      if (timeA > 0 && timeB > 0 && timeA !== timeB) {
        return timeB - timeA;
      }
      if (timeA > 0 && timeB === 0) return -1;
      if (timeB > 0 && timeA === 0) return 1;

      // Fallback: sort by release recency (higher AniList animeId = more recently released)
      return Number(b.animeId || 0) - Number(a.animeId || 0);
    });

    return list;
  }, [watchlist, activeTab, searchQuery, sortBy]);

  const totalPages = Math.ceil(filteredEntries.length / ITEMS_PER_PAGE);
  const paginatedEntries = filteredEntries.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      updateUrlParams({ page: newPage });
      window.scrollTo(0, 0);
    }
  };

  const handleResetFilters = () => {
    setSearchParams({}, { replace: true });
  };

  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  if (!isTauri && user?.isGuest) {
    return (
      <div className="library-container" style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ marginBottom: "16px", color: "var(--accent-primary, #6366f1)" }}>
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h2 style={{ color: "var(--text-primary, #ffffff)", fontSize: "24px", fontWeight: "700", margin: "0 0 10px 0" }}>
          Library is Locked in Guest Mode
        </h2>
        <p style={{ color: "var(--text-secondary, #94a3b8)", fontSize: "14px", maxWidth: "460px", margin: "0 auto 24px auto", lineHeight: "1.6" }}>
          Sign in or create a free PAL account to build your personal watchlist, track episode progress, and sync with AniList.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", maxWidth: "300px", margin: "0 auto" }}>
          <Link
            to="/login"
            style={{
              flex: 1,
              backgroundColor: "var(--accent-primary, #6366f1)",
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
              border: "1px solid var(--border-card, rgba(255, 255, 255, 0.15))",
              color: "var(--text-primary, #e2e8f0)",
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
              updateUrlParams({ q: e.target.value, page: 1 });
            }}
            className="library-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => updateUrlParams({ q: "", page: 1 })}
              className="library-search-clear"
            >
              ✕
            </button>
          )}
        </div>

        <LibrarySortDropdown
          value={sortBy}
          onChange={(val) => {
            updateUrlParams({ sort: val, page: 1 });
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
                updateUrlParams({ status: tab.key, page: 1 });
              }}
              className={`library-tab-btn ${activeTab === tab.key ? "active" : ""}`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {!loading && filteredEntries.length > 0 && (
        <p style={{ color: "var(--text-secondary, #aaa)", marginBottom: "15px", fontSize: "13px" }}>
          Showing {filteredEntries.length} {filteredEntries.length === 1 ? "title" : "titles"}
        </p>
      )}

      {/* Anime Card Grid */}
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
          {paginatedEntries.map((anime) => (
            <LibraryCard
              key={anime._id || anime.animeId}
              anime={anime}
              activeMenuId={activeMenuId}
              setActiveMenuId={setActiveMenuId}
              updateWatchlistItem={updateWatchlistItem}
              removeFromWatchlist={removeFromWatchlist}
            />
          ))}
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
