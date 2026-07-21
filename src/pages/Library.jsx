import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchUserWatchlist } from "../services/anilist";
import "../styles/Library.css";
import {
  getSavedUsernames,
  saveUsername,
  removeSavedUsername,
} from "../services/storage";
import { showToast } from "../services/toast";

export default function Library() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial values from URL or fallback to cached active user
  const initialUser = searchParams.get("user") || localStorage.getItem("pal_active_user") || "";
  const initialStatus = searchParams.get("status") || "CURRENT";

  const [username, setUsername] = useState(initialUser);
  const [activeTab, setActiveTab] = useState(initialStatus);
  const [rawLists, setRawLists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [savedUsers, setSavedUsers] = useState(() => getSavedUsernames());

  const handleSaveUser = (e) => {
    if (e) e.preventDefault();
    if (!username.trim()) return;
    const updated = saveUsername(username.trim());
    setSavedUsers([...updated]);
    showToast(`Saved user profile "${username.trim()}"`, "success");
  };

  const handleRemoveUser = (nameToRemove, e) => {
    if (e) e.stopPropagation();
    const updated = removeSavedUsername(nameToRemove);
    setSavedUsers([...updated]);
    showToast(`Removed user profile "${nameToRemove}"`, "info");
  };


  const handleFetch = async (e) => {
    if (e) e.preventDefault();
    if (!username.trim()) return;

    // 1. Update the URL parameters
    setSearchParams({ user: username.trim(), status: activeTab });

    setLoading(true);
    setError(null);
    try {
      const lists = await fetchUserWatchlist(username.trim());
      setRawLists(lists);
      localStorage.setItem("pal_active_user", username.trim());
    } catch (err) {
      const errMsg = err.message || "User not found or list is private.";
      setError(errMsg);
      setRawLists([]);
      showToast(errMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userParam = searchParams.get("user");
    if (userParam) {
      setLoading(true);
      fetchUserWatchlist(userParam)
        .then((lists) => {
          setRawLists(lists);
          localStorage.setItem("pal_active_user", userParam);
        })
        .catch((err) => {
          setError(err.message);
          showToast(err.message, "error");
        })
        .finally(() => setLoading(false));
    } else {
      const cachedUser = localStorage.getItem("pal_active_user");
      if (cachedUser) {
        setSearchParams({ user: cachedUser, status: activeTab });
        setUsername(cachedUser);
      }
    }
  }, [searchParams]);


  const currentList = rawLists.find(
    (l) => l.status === activeTab || l.name.toUpperCase() === activeTab,
  );
  const entries = currentList?.entries || [];

  return (
    <div className="library-container">
      <h2 className="library-title">My Library</h2>
      <p className="library-subtitle">
        Enter an AniList username to view public watchlist data.
      </p>

      {/* Username Search Input */}
      <form onSubmit={handleFetch} style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
  <input
    type="text"
    placeholder="AniList Username (e.g. Takagi)"
    value={username}
    onChange={(e) => setUsername(e.target.value)}
    style={{
      padding: "8px 14px",
      borderRadius: "6px",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      background: "#120e25",
      color: "#fff",
      outline: "none",
    }}
  />
  <button className="library-tab-btn active" type="submit" disabled={loading}>
    {loading ? "Loading..." : "Load Watchlist"}
  </button>
  <button
    type="button"
    className="library-tab-btn"
    onClick={handleSaveUser}
    style={{ background: "rgba(255,255,255,0.08)" }}
  >
    Save User
  </button>
</form>

{/* Saved User Quick-Switch Pills */}
{savedUsers.length > 0 && (
  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "20px", flexWrap: "wrap" }}>
    <span style={{ color: "#7a7690", fontSize: "13px" }}>Saved Users:</span>
    {savedUsers.map((u) => (
      <button
        key={u}
        onClick={() => {
          setUsername(u);
          setSearchParams({ user: u, status: activeTab });
        }}
        className={`library-tab-btn ${username.toLowerCase() === u.toLowerCase() ? "active" : ""}`}
        style={{ padding: "4px 10px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}
      >
        <span>{u}</span>
        <span
          onClick={(e) => handleRemoveUser(u, e)}
          style={{ opacity: 0.6, fontWeight: "bold", paddingLeft: "4px" }}
        >
          ✕
        </span>
      </button>
    ))}
  </div>
)}

      {error && (
        <p style={{ color: "#ef4444", marginBottom: "15px" }}>{error}</p>
      )}

      {/* Status Filter Tabs */}
      <div className="library-tabs">
        {[
          { label: "Watching", key: "CURRENT" },
          { label: "Completed", key: "COMPLETED" },
          { label: "Plan to Watch", key: "PLANNING" },
          { label: "Dropped", key: "DROPPED" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              if (username.trim()) {
                setSearchParams({ user: username.trim(), status: tab.key });
              }
            }}
            className={`library-tab-btn ${activeTab === tab.key ? "active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
          {entries.map(({ id, progress, media }) => {
            const cardColor = media.coverImage?.color || "#6366f1";
            const title =
              media.title.userPreferred ||
              media.title.english ||
              media.title.romaji;

            return (
              <Link
                key={id}
                to={`/anime/${media.id}`}
                className="card-link"
                style={{ "--hover-color": cardColor }}
              >
                <div className="anime-card">
                  <img
                    src={media.coverImage?.large || media.coverImage?.medium}
                    alt={title}
                    loading="lazy"
                  />
                  <div className="anime-title">{title}</div>
                  <div className="extra-info">
                    <p className="format">
                      Progress: {progress} / {media.episodes || "?"} eps
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
