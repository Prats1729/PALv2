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
            {["Watching", "Plan to Watch", "Completed", "Dropped"].map(status => (
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
  const [trending, setTrending] = useState([]);
  const [popular, setPopular] = useState([]);
  const [topAiring, setTopAiring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideInterval = useRef(null);

  // Fetch lists with cover image color property
  useEffect(() => {
    const fetchHomeData = async () => {
      const query = `
        query {
          trending: Page(page: 1, perPage: 10) { # Fetch 10 items for carousel
            media(sort: TRENDING_DESC, type: ANIME) {
              id
              title { english romaji native }
              coverImage { large color } # Added color
              bannerImage
              description(asHtml: false)
              averageScore
              format
              episodes
            }
          }
          popular: Page(page: 1, perPage: 6) {
            media(sort: POPULARITY_DESC, type: ANIME) {
              id
              title { english romaji }
              coverImage { large color } # Added color
              description(asHtml: false)
              averageScore
              format
              episodes
            }
          }
          topAiring: Page(page: 1, perPage: 7) {
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

      {/* BOTTOM SECTIONS SPLIT LAYOUT */}
      <div className="home-content-split">
        <div className="home-main-col">
          {/* 2. TRENDING NOW SECTION */}
          <section className="home-section">
            <h2>Trending Now</h2>
            <div className="anime-grid">
              {trending.slice(0, 6).map((anime) => (
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
