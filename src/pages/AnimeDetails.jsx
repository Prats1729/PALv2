import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import star from "../assets/star.png";
import "../styles/AnimeDetails.css";

import { useWatchlist } from "../context/WatchlistContext"; // <-- Import the new context hook

export default function AnimeDetails() {
  const { id } = useParams(); // get id from the url path
  
  // <-- Grab all our new PA system functions
  const { watchlist, addToWatchlist, updateWatchlistItem, removeFromWatchlist } = useWatchlist(); 

  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const charactersListRef = useRef(null);
  const statusMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target)) {
        setIsStatusMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Check if the current anime on the page is already saved in our database!
  const savedAnime = anime ? watchlist.find(item => item.animeId === anime.id) : null;

  const scrollCharacters = (direction) => {
    if (charactersListRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      charactersListRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

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
                        characters(sort: [ROLE, RELEVANCE], perPage: 15) {
                            edges {
                                role
                                node {
                                    id
                                    name {
                                        full
                                    }
                                    image {
                                        large
                                    }
                                }
                                voiceActors(language: JAPANESE, sort: [RELEVANCE]) {
                                    id
                                    name {
                                        full
                                    }
                                }
                            }
                        }
                        relations {
                            edges {
                                relationType
                                node {
                                    id
                                    title {
                                        english
                                        romaji
                                    }
                                    type
                                    format
                                    status
                                }
                            }
                        }
                    }
                }
            `;

      try {
        const response = await fetch("https://graphql.anilist.co/", {
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

  // AniList returns HTML in the description, so we can render it directly
  const descriptionHtml = anime.description || "No description available";

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
        <div className="details-left-col">
          <img
            src={anime.coverImage.large}
            alt={anime.title.english}
            className="details-cover"
          />
          {savedAnime ? (
            <div className="details-ops-panel">
              <div 
                className="ops-status-wrapper" 
                ref={statusMenuRef}
              >
                <button 
                  className="ops-status-trigger"
                  onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
                >
                  <span>{savedAnime.status}</span>
                  <span style={{ fontSize: '10px' }}>▼</span>
                </button>
                {isStatusMenuOpen && (
                  <div className="ops-status-menu">
                    {["Watching", "Plan to Watch", "Completed", "Dropped"].map(status => (
                      <button
                        key={status}
                        className="quick-add-option"
                        onClick={() => {
                          updateWatchlistItem(savedAnime.animeId, { status });
                          setIsStatusMenuOpen(false);
                        }}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="ops-row">
                <div className="ops-progress">
                  <span>Ep {savedAnime.progress} / {savedAnime.totalEpisodes || "?"}</span>
                  <button 
                    className="ops-progress-btn"
                    onClick={() => updateWatchlistItem(savedAnime.animeId, { progress: savedAnime.progress + 1 })}
                    disabled={savedAnime.progress >= savedAnime.totalEpisodes}
                    title="Watched another episode"
                  >
                    +
                  </button>
                </div>
                <button 
                  className="ops-drop-btn"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to drop this anime?")) {
                      updateWatchlistItem(savedAnime.animeId, { status: "Dropped" });
                    }
                  }}
                >
                  Drop
                </button>
              </div>
            </div>
          ) : (
            <button 
              className="ops-add-btn"
              onClick={() => addToWatchlist(anime)}
            >
              + Add to Watchlist
            </button>
          )}
        </div>

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
            <h2>Synopsis</h2>
            <p className="details-sypnosis" dangerouslySetInnerHTML={{ __html: descriptionHtml }}></p>
          </div>

          {/* Cast & Characters Section */}
          {anime.characters?.edges?.length > 0 && (
            <div className="details-section">
              <h2>Cast & Characters</h2>
              <div className="characters-carousel-container">
                <button 
                  className="scroll-arrow left-arrow" 
                  onClick={() => scrollCharacters('left')}
                  aria-label="Scroll left"
                >
                  ‹
                </button>
                <div className="characters-list" ref={charactersListRef}>
                  {anime.characters.edges.map((edge, index) => {
                    const char = edge.node;
                    const va = edge.voiceActors?.[0]; // Get the primary Japanese VA
                    return (
                      <div key={`${char.id}-${index}`} className="character-card">
                        <img src={char.image?.large} alt={char.name.full} loading="lazy" />
                        <div className="character-info">
                          <div className="char-name">{char.name.full}</div>
                          <div className="char-role">{edge.role}</div>
                          {va && (
                            <div className="va-name">
                              VA: {va.name.full}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button 
                  className="scroll-arrow right-arrow" 
                  onClick={() => scrollCharacters('right')}
                  aria-label="Scroll right"
                >
                  ›
                </button>
              </div>
            </div>
          )}

          {/* Related Anime Section */}
          {anime.relations?.edges?.length > 0 && (
            <div className="details-section">
              <h2>Related Media</h2>
              <div className="relations-container">
                {anime.relations.edges
                  // Optionally filter to only show Anime (not Manga), or show all.
                  // For now we'll show all but indicate the format.
                  .map((edge, index) => {
                    const related = edge.node;
                    const relationType = edge.relationType.replace(/_/g, ' ');
                    return (
                      <a 
                        href={related.type === "ANIME" ? `/anime/${related.id}` : '#'} 
                        key={`${related.id}-${index}`} 
                        className="relation-item"
                      >
                        <div className="relation-info">
                          <div className="relation-type">{relationType}</div>
                          <div className="relation-title">{related.title.english || related.title.romaji}</div>
                        </div>
                        <div className="relation-arrow">›</div>
                      </a>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
