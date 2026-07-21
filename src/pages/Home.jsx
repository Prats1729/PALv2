import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import star from "../assets/star.png";

// SUB-COMPONENT: ANIME CARD WITH DELAYED HOVER CARD PREVIEW
function AnimeCard({ anime }) {
  const [showPreview, setShowPreview] = useState(false);
  const hoverTimer = useRef(null);

  const handleMouseEnter = () => {
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

  const cardColor = anime.coverImage.color || "#6366f1";

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
            src={anime.coverImage.large}
            alt={anime.title.english || anime.title.romaji}
          />
          <div className="anime-title">
            {anime.title.english || anime.title.romaji}
          </div>
          <div className="score">
            <img src={star} alt="star" />
            {anime.averageScore ? `${anime.averageScore / 10}` : "N/A"}
          </div>
          <div className="extra-info">
            <p className="format">{anime.format}</p>
            <p className="episodes">{anime.episodes || "?"} eps</p>
          </div>
        </div>
      </Link>

      {/* FLOATING HOVER PREVIEW CARD */}
      {showPreview && (
        <div
          className="card-hover-preview"
          style={{ borderTop: `3px solid ${cardColor}` }}
        >
          <div className="hover-preview-header">
            <h3>{anime.title.english || anime.title.romaji}</h3>
            <span className="hover-format">{anime.format}</span>
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

// MAIN PAGE COMPONENT
export default function Home() {
  const [trending, setTrending] = useState([]);
  const [popular, setPopular] = useState([]);
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
              description
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
              averageScore
              format
              episodes
            }
          }
        }
      `;

      try {
        const response = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const json = await response.json();
        setTrending(json.data.trending.media);
        setPopular(json.data.popular.media);
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
  );
}
