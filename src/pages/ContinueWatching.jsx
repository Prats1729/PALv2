import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useWatchlist } from "../context/WatchlistContext";
import "../styles/Library.css";

export default function ContinueWatching() {
  const { watchlist, updateWatchlistItem, loading } = useWatchlist();
  const [historyTick, setHistoryTick] = useState(0);

  useEffect(() => {
    const handleHistory = () => setHistoryTick((t) => t + 1);
    window.addEventListener("pal-history-updated", handleHistory);
    return () => window.removeEventListener("pal-history-updated", handleHistory);
  }, []);

  const getRecentTimestamp = (anime) => {
    try {
      const history = JSON.parse(localStorage.getItem("pal_recent_history") || "{}");
      if (history[anime.animeId]) return history[anime.animeId];
    } catch {
      // fallback
    }
    if (anime.lastWatchedAt) return new Date(anime.lastWatchedAt).getTime();
    if (anime.updatedAt) return new Date(anime.updatedAt).getTime();
    return 0;
  };

  // Filter and sort by most recent watch activity
  const continueList = useMemo(() => {
    if (!watchlist) return [];
    return watchlist
      .filter((w) => {
        // Must not be Completed or Dropped
        if (w.status === "Completed" || w.status === "Dropped") return false;
        // If totalEpisodes is known and progress >= totalEpisodes, it is finished!
        if (w.totalEpisodes && w.progress >= w.totalEpisodes) return false;
        // Must be explicitly Watching or have positive progress
        return w.status === "Watching" || w.progress > 0;
      })
      .sort((a, b) => {
        const timeA = getRecentTimestamp(a);
        const timeB = getRecentTimestamp(b);
        return timeB - timeA;
      });
  }, [watchlist, historyTick]);

  const handleRemoveFromContinue = (e, item) => {
    e.preventDefault();
    e.stopPropagation();

    updateWatchlistItem(item.animeId, { status: "On Hold" });

    try {
      const history = JSON.parse(localStorage.getItem("pal_recent_history") || "{}");
      delete history[item.animeId];
      localStorage.setItem("pal_recent_history", JSON.stringify(history));
      window.dispatchEvent(new CustomEvent("pal-history-updated", { detail: { animeId: item.animeId } }));
    } catch {
      // ignore
    }

    window.dispatchEvent(
      new CustomEvent("pal-toast", {
        detail: {
          message: `Moved "${item.title}" to On Hold (Removed from Continue Watching)`,
          type: "info",
        },
      })
    );
  };

  return (
    <div className="library-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h2 className="library-title">
            <span style={{ color: "#6366f1", fontWeight: 900, marginRight: "8px" }}>|</span>
            Continue Watching
          </h2>
          <p className="library-subtitle">
            All anime currently in progress, sorted by your most recent watch history.
          </p>
        </div>
        <Link
          to="/library"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            color: "#fff",
            padding: "8px 16px",
            borderRadius: "8px",
            textDecoration: "none",
            fontSize: "13px",
            fontWeight: "500",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          Full Library ›
        </Link>
      </div>

      {!loading && continueList.length > 0 && (
        <p style={{ color: "#aaa", marginBottom: "20px", marginTop: "5px" }}>
          {continueList.length} anime in progress
        </p>
      )}

      {loading ? (
        <div className="anime-grid" style={{ padding: 0 }}>
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="skeleton-card" />
          ))}
        </div>
      ) : continueList.length === 0 ? (
        <div className="library-content-card">
          <p className="library-empty-text">No anime currently in progress.</p>
          <Link
            to="/discover"
            style={{
              display: "inline-block",
              marginTop: "12px",
              padding: "10px 20px",
              backgroundColor: "#6366f1",
              color: "white",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: "600"
            }}
          >
            Discover Anime
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "20px",
            marginTop: "10px"
          }}
        >
          {continueList.map((item) => {
            const hasMidPosition = item.lastPosition > 15 && item.lastPercent > 0;
            const nextEp = item.progress + 1;
            const progressPercent = hasMidPosition
              ? item.lastPercent
              : (item.totalEpisodes ? Math.min(100, Math.round((item.progress / item.totalEpisodes) * 100)) : (item.progress > 0 ? 50 : 0));

            const formatTime = (secs) => {
              const m = Math.floor(secs / 60);
              const s = Math.floor(secs % 60).toString().padStart(2, "0");
              return `${m}:${s}`;
            };

            return (
              <div
                key={item.animeId || item._id}
                style={{
                  backgroundColor: "#1a1822",
                  borderRadius: "10px",
                  overflow: "hidden",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  flexDirection: "column",
                  transition: "transform 0.2s ease, border-color 0.2s ease",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.4)"
                }}
              >
                <Link
                  to={`/anime/${item.animeId}`}
                  style={{ textDecoration: "none", position: "relative", display: "block" }}
                >
                  <div style={{ position: "relative", width: "100%", height: "145px" }}>
                    <img
                      src={item.coverImage}
                      alt={item.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      loading="lazy"
                    />
                    <button
                      type="button"
                      className="continue-remove-btn"
                      onClick={(e) => handleRemoveFromContinue(e, item)}
                      title="Remove from Continue Watching"
                      aria-label="Remove from Continue Watching"
                    >
                      ✕
                    </button>
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "linear-gradient(to top, rgba(11,8,19,0.9) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0) 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <div
                        style={{
                          width: "42px",
                          height: "42px",
                          backgroundColor: "rgba(99, 102, 241, 0.9)",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: "16px",
                          paddingLeft: "3px",
                          boxShadow: "0 4px 15px rgba(0,0,0,0.6)"
                        }}
                      >
                        ▶
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: "5px",
                        backgroundColor: "rgba(0,0,0,0.6)"
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${progressPercent}%`,
                          background: hasMidPosition ? "linear-gradient(90deg, #6366f1, #a855f7)" : "#6366f1"
                        }}
                      />
                    </div>
                  </div>
                </Link>

                <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
                  <div>
                    <Link
                      to={`/anime/${item.animeId}`}
                      style={{
                        color: "#fff",
                        textDecoration: "none",
                        fontSize: "14px",
                        fontWeight: "600",
                        display: "-webkit-box",
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden"
                      }}
                      title={item.title}
                    >
                      {item.title}
                    </Link>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                      <span style={{ color: "#6366f1", fontSize: "12px", fontWeight: "600" }}>
                        {hasMidPosition ? `Ep ${nextEp} (${item.lastPercent}%)` : `Ep ${item.progress} / ${item.totalEpisodes || "?"}`}
                      </span>
                      <span style={{ color: "#959595", fontSize: "11px" }}>
                        {hasMidPosition ? formatTime(item.lastPosition) : `${progressPercent}% watched`}
                      </span>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div style={{ display: "flex", gap: "8px", marginTop: "auto", paddingTop: "8px" }}>
                    <Link
                      to={`/anime/${item.animeId}`}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        backgroundColor: "#6366f1",
                        color: "#fff",
                        textDecoration: "none",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "600",
                        textAlign: "center",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px"
                      }}
                    >
                      {hasMidPosition ? `▶ Resume (${formatTime(item.lastPosition)})` : `▶ Play Ep ${nextEp}`}
                    </Link>
                    <button
                      onClick={() => updateWatchlistItem(item.animeId, { progress: Math.max(0, item.progress - 1), lastPosition: 0, lastPercent: 0 })}
                      disabled={item.progress <= 0}
                      style={{
                        padding: "0 10px",
                        backgroundColor: "rgba(255,255,255,0.06)",
                        color: "#fff",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "6px",
                        cursor: item.progress <= 0 ? "not-allowed" : "pointer",
                        fontWeight: "bold",
                        opacity: item.progress <= 0 ? 0.4 : 1
                      }}
                      title="Watched one less episode"
                    >
                      -
                    </button>
                    <button
                      onClick={() => updateWatchlistItem(item.animeId, { progress: item.progress + 1, lastPosition: 0, lastPercent: 0 })}
                      disabled={item.totalEpisodes ? item.progress >= item.totalEpisodes : false}
                      style={{
                        padding: "0 10px",
                        backgroundColor: "rgba(255,255,255,0.06)",
                        color: "#fff",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "6px",
                        cursor: (item.totalEpisodes && item.progress >= item.totalEpisodes) ? "not-allowed" : "pointer",
                        fontWeight: "bold",
                        opacity: (item.totalEpisodes && item.progress >= item.totalEpisodes) ? 0.4 : 1
                      }}
                      title="Watched another episode"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
