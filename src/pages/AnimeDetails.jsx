import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import star from "../assets/star.png";
import "../styles/AnimeDetails.css";

export default function AnimeDetails() {
  const { id } = useParams(); // get id from the url path
  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);

      // Simple GraphQL query for single anime
      const query = `
                query ($id: Int) {
                    Media(id: $id, type: ANIME) {
                        id
                        title {
                            english
                            romaji
                            native
                        }
                        coverImage {
                            large
                        }
                        bannerImage
                        description
                        format
                        episodes
                        status
                        genres
                        averageScore
                        seasonYear
                    }
                }
            `;

      try {
        const response = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, variables: { id: parseInt(id) } }),
        });
        const json = await response.json();

        if (json.errors) {
          throw new Error(json.errors[0].message);
        }

        setAnime(json.data.Media);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  if (loading) return <div className="details-status">Loading anime...</div>;
  if (error)
    return (
      <div className="details-status" style={{ color: "red" }}>
        Error: {error}
      </div>
    );
  if (!anime) return <div className="details-status">No anime found.</div>;

  //clean description
  const cleanedDescription = anime.description
    ? anime.description.replace(/<br\s*\/?>/gi, " ")
    : "No description available";

  return (
    <div className="details-container">
      {/* banner */}
        <div className="details-banner-wrapper">
          {anime.bannerImage ? (
            <img
                style={
                    {marginTop: "15px"}
                        
                    
                }
              src={anime.bannerImage}
              alt="banner"
              className="details-banner"
            />
          ) : (
            <div className="details-banner-placeholder"></div>
          )}
        </div>
      <div className="details-content">
        <img
          src={anime.coverImage.large}
          alt={anime.title.english}
          className="details-cover"
        />
        <div className="details-main-info">
          <h1>
            {anime.title.english || anime.title.romaji || anime.title.native}
          </h1>
          <div className="details-meta">
            <span>{anime.format}</span>
            <span>•</span>
            <span>{anime.episodes || "?"} Episodes</span>
            <span>•</span>
            <span>{anime.seasonYear}</span>
            <div className="details-rating">
              <img src={star} alt="rating" />
              {anime.averageScore ? `${anime.averageScore / 10}` : "N/A"}
            </div>
          </div>
          <div className="genres-container">
            {anime.genres.map((genre) => (
              <span key={genre} className="genre-badge">
                {genre}
              </span>
            ))}
          </div>
          <div className="details-sypnosis-section">
            <h2>Sypnosis</h2>
            <p className="details-sypnosis">{cleanedDescription}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
