import { useState, useEffect, useRef, useMemo } from "react";
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
              className="airing-quick-add-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsAdding(true);
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
import { platformCapabilities } from "../utils/platform";

export default function Home() {
  const { watchlist, updateWatchlistItem } = useWatchlist();
  const [trending, setTrending] = useState([]);
  const [popular, setPopular] = useState([]);
  const [topAiring, setTopAiring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideInterval = useRef(null);
  const continueListRef = useRef(null);
  const handleRemoveFromContinue = (e, item) => {
    e.preventDefault();
    e.stopPropagation();

    // Clear watch timestamp and position without modifying user's library category
    updateWatchlistItem(item.animeId, {
      lastWatchedAt: null,
      lastPosition: 0,
      lastPercent: 0,
      lastDuration: 0,
    });

    window.dispatchEvent(
      new CustomEvent("pal-toast", {
        detail: {
          message: `Removed "${item.title}" from Continue Watching`,
          type: "info",
        },
      })
    );
  };

  const continueWatching = (watchlist || [])
    .filter((w) => {
      // Must have an actual recorded watch timestamp
      if (!w.lastWatchedAt) return false;
      // Must not be Completed or Dropped
      if (w.status === "Completed" || w.status === "Dropped") return false;
      // If totalEpisodes is known and progress >= totalEpisodes, it is finished!
      if (w.totalEpisodes && w.progress >= w.totalEpisodes) return false;
      return true;
    })
    .sort((a, b) => {
      const timeA = new Date(a.lastWatchedAt).getTime();
      const timeB = new Date(b.lastWatchedAt).getTime();
      return timeB - timeA;
    });

  const scrollContinue = (direction) => {
    if (continueListRef.current) {
      const scrollAmount = direction === "left" ? -400 : 400;
      continueListRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const [failedBannerIds, setFailedBannerIds] = useState(() => new Set());

  useEffect(() => {
    const fetchHomeData = async () => {
      const query = `
        query {
          trending: Page(page: 1, perPage: 30) {
            media(sort: TRENDING_DESC, type: ANIME) {
              id
              title { english romaji native }
              coverImage { extraLarge large color }
              bannerImage
              description(asHtml: false)
              averageScore
              format
              episodes
              status
              season
              seasonYear
              genres
              tags { name isMediaSpoiler isGeneralSpoiler }
              characters(sort: [ROLE, RELEVANCE], perPage: 6) {
                edges {
                  node { id }
                  voiceActors(language: ENGLISH) { id }
                }
              }
            }
          }
          popular: Page(page: 1, perPage: 10) {
            media(sort: POPULARITY_DESC, type: ANIME) {
              id
              title { english romaji }
              coverImage { extraLarge large color }
              description(asHtml: false)
              averageScore
              format
              episodes
              genres
              tags { name isMediaSpoiler isGeneralSpoiler }
              characters(sort: [ROLE, RELEVANCE], perPage: 6) {
                edges {
                  node { id }
                  voiceActors(language: ENGLISH) { id }
                }
              }
            }
          }
          topAiring: Page(page: 1, perPage: 10) {
            media(sort: SCORE_DESC, status: RELEASING, type: ANIME) {
              id
              title { english romaji }
              coverImage { extraLarge large color }
              description(asHtml: false)
              averageScore
              format
              episodes
              nextAiringEpisode { episode }
              genres
              tags { name isMediaSpoiler isGeneralSpoiler }
              characters(sort: [ROLE, RELEVANCE], perPage: 6) {
                edges {
                  node { id }
                  voiceActors(language: ENGLISH) { id }
                }
              }
            }
          }
        }
      `;

      try {
        const res = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ query }),
        });
        const json = await res.json();
        if (json.data) {
          setTrending(json.data.trending.media);
          setPopular(json.data.popular.media);
          setTopAiring(json.data.topAiring.media);
        }
      } catch (err) {
        console.error("Failed to fetch home page data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  // Filter trending anime with valid native banner images for Hero Carousel (up to 10)
  const heroSlides = useMemo(() => {
    return trending
      .filter((item) => Boolean(item.bannerImage) && !failedBannerIds.has(item.id))
      .slice(0, 10);
  }, [trending, failedBannerIds]);

  // Autoplay Hero Carousel
  const startSlideShow = () => {
    stopSlideShow();
    if (heroSlides.length <= 1) return;
    slideInterval.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % (heroSlides.length || 1));
    }, 6000);
  };

  const stopSlideShow = () => {
    if (slideInterval.current) {
      clearInterval(slideInterval.current);
    }
  };

  useEffect(() => {
    if (heroSlides.length > 0) {
      setCurrentSlide((prev) => (prev >= heroSlides.length ? 0 : prev));
      startSlideShow();
    }
    return () => stopSlideShow();
  }, [heroSlides.length]);

  const handlePrevSlide = () => {
    stopSlideShow();
    if (heroSlides.length === 0) return;
    setCurrentSlide((prev) => (prev === 0 ? heroSlides.length - 1 : prev - 1));
    startSlideShow();
  };

  const handleNextSlide = () => {
    stopSlideShow();
    if (heroSlides.length === 0) return;
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    startSlideShow();
  };

  if (loading) {
    return (
      <div className="home-container">
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

  const safeSlideIndex = currentSlide < heroSlides.length ? currentSlide : 0;
  const heroAnime = heroSlides[safeSlideIndex] || null;
  const heroDescription = heroAnime?.description
    ? heroAnime.description.replace(/<[^>]*>/g, "").substring(0, 240) + "..."
    : "";

  return (
    <div className="home-container">
      {/* 1. HERO SLIDER BANNER (Full-Bleed, Flowy, High-Res) */}
      {heroAnime && (
        <div
          key={heroAnime.id}
          className="hero-section"
          style={{
            backgroundImage: `url(${heroAnime.bannerImage})`,
          }}
        >
          {/* Silent image listener for broken/failed banner URLs */}
          <img
            src={heroAnime.bannerImage}
            alt=""
            style={{ display: "none" }}
            onError={() => {
              setFailedBannerIds((prev) => {
                const next = new Set(prev);
                next.add(heroAnime.id);
                return next;
              });
            }}
          />

          {/* Multi-layered cinematic gradient overlays */}
          <div className="hero-gradient-overlay" />

          <div className="hero-content">
            {/* Metadata Badges */}
            <div className="hero-meta-badges">
              <span className="hero-badge">#{safeSlideIndex + 1} TRENDING</span>
              {heroAnime.status && (
                <span className={`hero-meta-tag status-${heroAnime.status.toLowerCase()}`}>
                  {heroAnime.status}
                </span>
              )}
              {heroAnime.season && heroAnime.seasonYear && (
                <span className="hero-meta-tag">
                  {heroAnime.season} {heroAnime.seasonYear}
                </span>
              )}
              {heroAnime.episodes && (
                <span className="hero-meta-tag">
                  Ep {heroAnime.episodes}
                </span>
              )}
              {heroAnime.averageScore && (
                <span className="hero-meta-tag score">
                  {heroAnime.averageScore}%
                </span>
              )}
            </div>

            <h1 className="hero-title">
              {heroAnime.title.english || heroAnime.title.romaji}
            </h1>

            <p className="hero-desc">{heroDescription}</p>

            <div className="hero-actions">
              <Link to={`/anime/${heroAnime.id}`} className="hero-button watch-now-btn">
                <span className="play-triangle">▶</span> Watch Now
              </Link>
              <Link to={`/anime/${heroAnime.id}`} className="hero-button details-btn" title="View Details">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="info-circle-icon">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span className="details-text-label">Details</span>
              </Link>
            </div>
          </div>

          {/* Carousel Indicators */}
          {heroSlides.length > 1 && (
            <div className="carousel-indicators">
              {heroSlides.map((_, index) => (
                <span
                  key={index}
                  className={`indicator-dash ${index === safeSlideIndex ? "active" : ""}`}
                  onClick={() => {
                    stopSlideShow();
                    setCurrentSlide(index);
                    startSlideShow();
                  }}
                />
              ))}
            </div>
          )}

          {/* Carousel Arrows */}
          {heroSlides.length > 1 && (
            <div className="carousel-arrows">
              <button className="arrow-btn" onClick={handlePrevSlide} aria-label="Previous Slide">
                ‹
              </button>
              <button className="arrow-btn" onClick={handleNextSlide} aria-label="Next Slide">
                ›
              </button>
            </div>
          )}
        </div>
      )}

      {/* 1.5 CONTINUE WATCHING SECTION (DESKTOP APP ONLY) */}
      {platformCapabilities.continueWatching && continueWatching.length > 0 && (
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
                            background: "var(--accent-primary, #6366f1)"
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
                          <span>Ep {nextEp} • <span style={{ color: "var(--accent-primary, #818cf8)" }}>{formatTime(item.lastPosition)} ({item.lastPercent}%)</span></span>
                        ) : (
                          <span>Episode {nextEp} • <span style={{ color: "var(--text-secondary, #9ca3af)" }}>Up Next</span></span>
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
            <h2 className="home-section-heading">
              <span className="section-bar">|</span> Trending Now
            </h2>
            <div className="anime-grid">
              {trending.slice(0, 12).map((anime) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
            </div>
          </section>

          {/* 3. POPULAR THIS SEASON SECTION */}
          <section className="home-section">
            <h2 className="home-section-heading">
              <span className="section-bar">|</span> Popular This Season
            </h2>
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
            <h2 className="home-section-heading sidebar-title">
              <span className="section-bar">|</span> Top Airing
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
