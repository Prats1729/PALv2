import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import star from "../../assets/star.png";
import { useWatchlist } from "../../context/WatchlistContext";

// REUSABLE ANIME CARD WITH DELAYED HOVER CARD PREVIEW
export default function AnimeCard({ anime }) {
  const { watchlist, addToWatchlist } = useWatchlist();
  const [showPreview, setShowPreview] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [hoverPosition, setHoverPosition] = useState("right");
  const hoverTimer = useRef(null);

  const handleMouseEnter = (e) => {
    // Determine position before showing
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.right + 270 > window.innerWidth) {
      setHoverPosition("left");
    } else {
      setHoverPosition("right");
    }

    // 450ms delay before triggering the detailed preview
    hoverTimer.current = setTimeout(() => {
      setShowPreview(true);
    }, 450);
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
    }
    setShowPreview(false);
  };

  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    };
  }, []);

  const cleanDescription = anime.description
    ? anime.description.replace(/<[^>]*>/g, "").substring(0, 120) + "..."
    : "No synopsis available.";

  const cardColor = anime.coverImage?.color || "#6366f1";
  const isSaved = watchlist.some(w => w.animeId === anime.id);

  return (
    <div
      className="anime-card-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        to={`/anime/${anime.id}`}
        className="card-link"
        style={{ "--hover-color": cardColor }}
      >
        <div className="anime-card">
          <img
            src={anime.coverImage?.large}
            alt={anime.title?.english || anime.title?.romaji || "Anime"}
            loading="lazy"
          />
          {!isSaved && !isAdding && (
            <div className="quick-add-container">
              <button 
                className="quick-add-trigger"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsAdding(true);
                }}
                title="Quick Add to Watchlist"
              >
                + Add to Watchlist
              </button>
            </div>
          )}
          {!isSaved && isAdding && (
            <div 
              className="quick-add-menu" 
              onMouseLeave={() => setIsAdding(false)}
            >
              {["Watching", "Plan to Watch", "Completed", "Dropped"].map(status => (
                <button
                  key={status}
                  className="quick-add-option"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addToWatchlist(anime, status);
                    setIsAdding(false);
                  }}
                >
                  {status}
                </button>
              ))}
            </div>
          )}
          <div className="anime-info">
            <div className="anime-title" title={anime.title?.english || anime.title?.romaji}>
              {anime.title?.english || anime.title?.romaji}
            </div>
          </div>
        </div>
      </Link>

      {/* FLOATING HOVER PREVIEW CARD */}
      {showPreview && (
        <div
          className="card-hover-preview"
          style={{ 
            borderTop: `3px solid ${cardColor}`,
            left: hoverPosition === "right" ? "105%" : "auto",
            right: hoverPosition === "left" ? "105%" : "auto"
          }}
        >
          <div className="hover-preview-header">
            <h3>{anime.title?.english || anime.title?.romaji}</h3>
            <span className="hover-format">{anime.format || "TV"}</span>
          </div>
          <div className="hover-preview-meta">
            <span className="hover-rating">
              <img src={star} alt="star" /> {anime.averageScore ? `${anime.averageScore / 10}` : "N/A"}
            </span>
            <span>•</span>
            <span>{anime.episodes || "?"} Episodes</span>
          </div>
          <p className="hover-preview-desc">{cleanDescription}</p>
        </div>
      )}
    </div>
  );
}
