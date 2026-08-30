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
    // Determine position before showing (preview card width is 270px + padding)
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.right + 285 > window.innerWidth) {
      setHoverPosition("left");
    } else {
      setHoverPosition("right");
    }

    // 400ms delay before triggering the detailed preview
    hoverTimer.current = setTimeout(() => {
      setShowPreview(true);
    }, 400);
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

  const hasDub = Boolean(
    anime?.hasDub ||
    anime?.characters?.edges?.some(
      (edge) =>
        (edge.voiceActors && edge.voiceActors.length > 0) ||
        (edge.dubActors && edge.dubActors.length > 0)
    )
  );

  const displayGenres = (anime.genres || []).slice(0, 3);
  const displayTags = (anime.tags || [])
    .filter(t => !t.isMediaSpoiler && !t.isGeneralSpoiler)
    .map(t => typeof t === "string" ? t : t.name)
    .filter(t => !displayGenres.includes(t))
    .slice(0, 2);

  return (
    <div
      className={`anime-card-wrapper ${isAdding ? "dropdown-open" : ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: "relative",
        zIndex: isAdding ? 9999 : (showPreview ? 50 : 1)
      }}
    >
      <Link
        to={`/anime/${anime.id}`}
        className={`card-link ${isAdding ? "dropdown-open" : ""}`}
        style={{ 
          "--hover-color": cardColor,
          position: "relative",
          zIndex: isAdding ? 9999 : 1
        }}
      >
        <div 
          className={`anime-card ${isAdding ? "dropdown-open" : ""}`}
          style={{
            position: "relative",
            zIndex: isAdding ? 9999 : 1
          }}
        >
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
              {["Watching", "Plan to Watch", "Completed", "On Hold", "Dropped"].map(status => (
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
          className={`card-hover-preview pos-${hoverPosition}`}
          style={{ 
            borderTop: `3px solid ${cardColor}`,
            left: hoverPosition === "right" ? "105%" : "auto",
            right: hoverPosition === "left" ? "105%" : "auto"
          }}
        >
          <div className="hover-preview-header">
            <h3>{anime.title?.english || anime.title?.romaji}</h3>
            <div className="hover-badges-row">
              <span className="hover-format">{anime.format || "TV"}</span>
              <span 
                className={`hover-audio-badge ${hasDub ? "both" : "sub-only"}`}
                title={hasDub ? "Japanese Sub & English Dub available" : "Japanese Sub only"}
              >
                {hasDub ? "SUB | DUB" : "SUB"}
              </span>
            </div>
          </div>
          <div className="hover-preview-meta">
            <span className="hover-rating">
              <img src={star} alt="star" /> {anime.averageScore ? `${anime.averageScore / 10}` : "N/A"}
            </span>
            <span>•</span>
            <span>{anime.episodes || "?"} Episodes</span>
            {anime.status && (
              <>
                <span>•</span>
                <span className="hover-status">{anime.status.replace(/_/g, " ")}</span>
              </>
            )}
          </div>

          {(displayGenres.length > 0 || displayTags.length > 0) && (
            <div className="hover-tags-container">
              {displayGenres.map((genre) => (
                <span key={genre} className="hover-chip hover-genre-chip">
                  {genre}
                </span>
              ))}
              {displayTags.map((tag) => (
                <span key={tag} className="hover-chip hover-tag-chip">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <p className="hover-preview-desc">{cleanDescription}</p>
        </div>
      )}
    </div>
  );
}
