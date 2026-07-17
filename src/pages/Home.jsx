import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import star from "../assets/star.png";

export default function Home() {
  const [trending, setTrending] = useState([]);
  const [popular, setPopular] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHomeData = async () => {
      // GraphQL query to get both trending and popular anime
      const query = `
        query {
          trending: Page(page: 1, perPage: 6) {
            media(sort: TRENDING_DESC, type: ANIME) {
              id
              title { english romaji native }
              coverImage { large }
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
              title { english romaji native }
              coverImage { large }
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

  if (loading) return <div className="home-loading">Loading dashboard...</div>;

  // Use the banner image of the #1 trending show for our Hero section
  const heroAnime = trending[0];
  const heroDescription = heroAnime?.description
    ? heroAnime.description.replace(/<[^>]*>/g, "").substring(0, 220) + "..."
    : "";

  return (
    <div className="home-container">
      {/* 1. HERO BANNER */}
      {heroAnime && (
        <div
          className="hero-section"
          style={{
            backgroundImage: `linear-gradient(to top, #0b0813 5%, rgba(11, 8, 19, 0.2) 60%, rgba(11, 8, 19, 0.5) 98%, #0b0813 100%), url(${heroAnime.bannerImage})`,
          }}
        >
          <div className="hero-content">
            <span className="hero-badge">#1 TRENDING</span>
            <h1 className="hero-title">
              {heroAnime.title.english || heroAnime.title.romaji}
            </h1>
            <p className="hero-desc">{heroDescription}</p>
            <Link to={`/anime/${heroAnime.id}`} className="hero-button">
              View Details
            </Link>
          </div>
        </div>
      )}

      {/* 2. TRENDING NOW SECTION */}
      <section className="home-section">
        <h2>Trending Now</h2>
        <div className="anime-grid">
          {trending.map((anime) => (
            <Link
              to={`/anime/${anime.id}`}
              key={anime.id}
              className="card-link"
            >
              <div className="anime-card">
                <img src={anime.coverImage.large} alt={anime.title.english} />
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
          ))}
        </div>
      </section>

      {/* 3. POPULAR THIS SEASON SECTION */}
      <section className="home-section">
        <h2>Popular This Season</h2>
        <div className="anime-grid">
          {popular.map((anime) => (
            <Link
              to={`/anime/${anime.id}`}
              key={anime.id}
              className="card-link"
            >
              <div className="anime-card">
                <img src={anime.coverImage.large} alt={anime.title.english} />
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
          ))}
        </div>
      </section>
    </div>
  );
}
