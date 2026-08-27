import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import star from "../assets/star.png";
import { useWatchlist } from "../context/WatchlistContext";

import AnimeCard from "../components/common/AnimeCard";

// SUB-COMPONENT: AIRING CARD FOR VERTICAL LIST
function AiringCard({ anime }) {
  const { watchlist, addToWatchlist } = useWatchlist();
  const [isAdding, setIsAdding] = useState(false);
  const isSaved = watchlist.some(w => w.animeId === anime.id);

  const title = anime.title.english || anime.title.romaji;
  const cardColor = anime.coverImage?.color || "#6366f1";
  
  return (
    <Link
      to={`/anime/${anime.id}`}
      className="airing-card"
      style={{ "--hover-color": cardColor, position: "relative" }}
    >
      <div className="airing-card-inner">
        <img src={anime.coverImage.large} alt={title} loading="lazy" />
        
        <div className="airing-info">
          <div className="airing-title" title={title}>{title}</div>
          <div className="airing-meta">
            <span>{anime.format || "TV"}</span>
            <span className="dot">•</span>
            <span className="airing-ep">Ep {anime.nextAiringEpisode?.episode || anime.episodes || "?"}</span>
            <span className="dot">•</span>
            <span className="airing-score"><img src={star} alt="star" /> {anime.averageScore ? `${anime.averageScore / 10}` : "N/A"}</span>
          </div>
        </div>
        
        {!isSaved && !isAdding && (
          <div style={{ display: "flex", alignItems: "center", paddingRight: "12px" }}>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsAdding(true);
              }}
              style={{
                background: "rgba(99, 102, 241, 0.9)",
                color: "white",
                border: "none",
                borderRadius: "50%",
                width: "24px",
                height: "24px",
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 2px 5px rgba(0,0,0,0.5)"
              }}
              title="Quick Add to Watchlist"
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* Floating custom dropdown overlay for AiringCard */}
      {!isSaved && isAdding && (
        <div style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", zIndex: 20 }}>
          <div 
            className="airing-quick-add-menu" 
            onMouseLeave={() => setIsAdding(false)}
          >
            {["Watching", "Plan to Watch", "Completed", "On Hold", "Dropped"].map(status => (
              <button
                key={status}
                className="quick-add-option"
                style={{ padding: "8px 12px", fontSize: "12px" }}
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
        </div>
      )}
    </Link>
  );
}

// MAIN PAGE COMPONENT
export default function Home() {
  const { watchlist, updateWatchlistItem } = useWatchlist();
  const [trending, setTrending] = useState([]);
  const [popular, setPopular] = useState([]);
  const [topAiring, setTopAiring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideInterval = useRef(null);
  const continueListRef = useRef(null);
  const [historyTick, setHistoryTick] = useState(0);

  useEffect(() => {
    const handleHistory = () => setHistoryTick((t) => t + 1);
    window.addEventListener("pal-history-updated", handleHistory);
    return () => window.removeEventListener("pal-history-updated", handleHistory);
  }, []);

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

  const continueWatching = (watchlist || [])
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

  const scrollContinue = (direction) => {
    if (continueListRef.current) {
      const scrollAmount = direction === "left" ? -400 : 400;
      continueListRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Fetch lists with cover image color property
  useEffect(() => {
    const fetchHomeData = async () => {
      const query = `
        query {
          trending: Page(page: 1, perPage: 10) { # Fetch 10 items for carousel & grid
            media(sort: TRENDING_DESC, type: ANIME) {
              id
              title { english romaji native }
              coverImage { large color }
              bannerImage
              description(asHtml: false)
              averageScore
              format
              episodes
            }
          }
          popular: Page(page: 1, perPage: 10) {
            media(sort: POPULARITY_DESC, type: ANIME) {
              id
              title { english romaji }
              coverImage { large color }
              description(asHtml: false)
              averageScore
              format
              episodes
            }
          }
          topAiring: Page(page: 1, perPage: 10) {
            media(sort: SCORE_DESC, status: RELEASING, type: ANIME) {
              id
              title { english romaji }
              coverImage { large color }
              description(asHtml: false)
              averageScore
              format
              episodes
              nextAiringEpisode { episode }
            }
          }
        }
      `;

      try {
        const response = await fetch("https://graphql.anilist.co/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const json = await response.json();
        setTrending(json.data.trending.media);
        setPopular(json.data.popular.media);
        setTopAiring(json.data.topAiring.media);
      } catch (err) {
        console.error("Failed to load home content:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  // Slide Cycle Management
  const startSlideShow = () => {
    stopSlideShow();
    slideInterval.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 10);
    }, 7000); // Cycle every 7 seconds
  };

  const stopSlideShow = () => {
    if (slideInterval.current) clearInterval(slideInterval.current);
  };

  useEffect(() => {
    if (trending.length > 0) {
      startSlideShow();
    }
    return () => stopSlideShow();
  }, [trending]);

  const handleNextSlide = () => {
    stopSlideShow();
    setCurrentSlide((prev) => (prev + 1) % trending.length);
    startSlideShow();
  };

  const handlePrevSlide = () => {
    stopSlideShow();
    setCurrentSlide((prev) => (prev - 1 + trending.length) % trending.length);
    startSlideShow();
  };

  if (loading) {
    return (
      <div className="home-container" style={{ marginTop: "1.5rem" }}>
        <div className="skeleton-hero" />
        <div className="home-section" style={{ marginTop: "40px" }}>
          <h2>Trending Now</h2>
          <div className="anime-grid" style={{ padding: "0 20px" }}>
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="skeleton-card" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const heroAnime = trending[currentSlide];
  const heroDescription = heroAnime?.description
    ? heroAnime.description.replace(/<[^>]*>/g, "").substring(0, 220) + "..."
    : "";

  return (
    <div className="home-container">
      {/* 1. HERO SLIDER BANNER */}
      {heroAnime && (
        <div
          key={heroAnime.id}
          className="hero-section"
          style={{
            marginTop: "1.5rem",
            backgroundImage: `linear-gradient(to top, #0b0813 5%, rgba(11, 8, 19, 0.2) 60%, rgba(11, 8, 19, 0.5) 98%, #0b0813 100%), url(${heroAnime.bannerImage || heroAnime.coverImage.large})`,
          }}
        >
          <div className="hero-content">
            <span className="hero-badge">#{currentSlide + 1} TRENDING</span>
            <h1 className="hero-title">
              {heroAnime.title.english || heroAnime.title.romaji}
            </h1>
            <p className="hero-desc">{heroDescription}</p>
            <div className="hero-actions">
              <Link to={`/anime/${heroAnime.id}`} className="hero-button">
                View Details
              </Link>
            </div>
          </div>

          {/* Carousel Indicators (Bottom Left) */}
          <div className="carousel-indicators">
            {trending.map((_, index) => (
              <span
                key={index}
                className={`indicator-dash ${index === currentSlide ? "active" : ""}`}
                onClick={() => {
                  stopSlideShow();
                  setCurrentSlide(index);
                  startSlideShow();
                }}
              />
            ))}
          </div>

          {/* Carousel Arrows (Bottom Right) */}
          <div className="carousel-arrows">
            <button className="arrow-btn" onClick={handlePrevSlide}>
              ‹
            </button>
            <button className="arrow-btn" onClick={handleNextSlide}>
              ›
            </button>
          </div>
        </div>
      )}

      {/* 1.5 CONTINUE WATCHING SECTION */}
      {continueWatching.length > 0 && (
        <section className="continue-watching-section">
          <div className="continue-header-row">
            <h2 className="continue-heading">
              <span className="continue-bar">|</span> Continue Watching
            </h2>
            <Link to="/continue-watching" className="continue-view-all">
              View All ›
            </Link>
          </div>

          <div className="continue-carousel-container">
            <button
              className="continue-arrow left"
              onClick={() => scrollContinue("left")}
              aria-label="Scroll left"
            >
              ‹
            </button>

            <div className="continue-list" ref={continueListRef}>
              {continueWatching.map((item) => {
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
                  <Link
                    key={item.animeId || item._id}
                    to={`/anime/${item.animeId}`}
                    className="continue-card"
                    style={{ "--card-color": item.color || "#6366f1" }}
                  >
                    <div className="continue-thumb-wrapper">
                      <img
                        src={item.coverImage}
                        alt={item.title}
                        className="continue-thumb"
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
                      <div className="continue-play-overlay">
                        <div className="continue-play-icon">▶</div>
                      </div>
                      <div className="continue-progress-bar-bg">
                        <div
                          className="continue-progress-bar-fill"
                          style={{ 
                            width: `${progressPercent}%`,
                            background: hasMidPosition ? "linear-gradient(90deg, #6366f1, #a855f7)" : "#6366f1"
                          }}
                        />
                      </div>
                    </div>
                    <div className="continue-info">
                      <div className="continue-title" title={item.title}>
                        {item.title}
                      </div>
                      <div className="continue-ep">
                        {hasMidPosition ? (
                          <span>Ep {nextEp} • <span style={{ color: "#818cf8" }}>{formatTime(item.lastPosition)} ({item.lastPercent}%)</span></span>
                        ) : (
                          <span>Episode {nextEp} • <span style={{ color: "#9ca3af" }}>Up Next</span></span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <button
              className="continue-arrow right"
              onClick={() => scrollContinue("right")}
              aria-label="Scroll right"
            >
              ›
            </button>
          </div>
        </section>
      )}

      {/* BOTTOM SECTIONS SPLIT LAYOUT */}
      <div className="home-content-split">
        <div className="home-main-col">
          {/* 2. TRENDING NOW SECTION */}
          <section className="home-section">
            <h2>Trending Now</h2>
            <div className="anime-grid">
              {trending.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
            </div>
          </section>

          {/* 3. POPULAR THIS SEASON SECTION */}
          <section className="home-section">
            <h2>Popular This Season</h2>
            <div className="anime-grid">
              {popular.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
            </div>
          </section>
        </div>

        {/* 4. TOP AIRING SIDEBAR */}
        <aside className="home-sidebar">
          <div className="home-section">
            <h2 className="sidebar-title">
              <span className="caret">›</span> TOP AIRING
            </h2>
            <div className="airing-list">
              {topAiring.map((anime) => (
                <AiringCard key={anime.id} anime={anime} />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
