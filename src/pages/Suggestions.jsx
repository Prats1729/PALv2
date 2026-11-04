import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useWatchlist } from "../context/WatchlistContext";
import { fetchAnimeRecommendations, fetchGenreRecommendations } from "../services/anilist";
import AnimeCard from "../components/common/AnimeCard";
import "../styles/Suggestions.css";

// Vibe & format definitions for the Rewatch tab (clean text, no emojis)
const VIBE_FILTERS = [
  { id: "all", label: "All Completed" },
  { id: "short", label: "Quick / Movies (≤ 13 eps)" },
  { id: "action", label: "Action & Hype", genres: ["Action", "Adventure"] },
  { id: "comfort", label: "Slice of Life & Chill", genres: ["Slice of Life", "Comedy", "Romance"] },
  { id: "thriller", label: "Mystery & Psychological", genres: ["Mystery", "Psychological", "Sci-Fi", "Thriller"] },
  { id: "fantasy", label: "Fantasy & Supernatural", genres: ["Fantasy", "Supernatural"] }
];

// Predefined available genres for the recommendation selector
const POPULAR_GENRES = [
  "Action", "Romance", "Isekai", "Sci-Fi", "Comedy", "Drama",
  "Fantasy", "Mystery", "Psychological", "Slice of Life", "Sports", "Supernatural", "Thriller"
];

export default function Suggestions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "rewatch"; // 'rewatch' | 'recommendations'
  const { watchlist } = useWatchlist();

  // ----------------------------------------------------
  // REWATCH TAB STATE
  // ----------------------------------------------------
  const [activeVibe, setActiveVibe] = useState("all");
  const [spotlightIndex, setSpotlightIndex] = useState(() => Math.floor(Math.random() * 10000));

  // Filter completed anime from user's watchlist
  const completedList = useMemo(() => {
    return (watchlist || []).filter(
      item => item.status?.toUpperCase() === "COMPLETED"
    );
  }, [watchlist]);

  // Apply Vibe filter
  const filteredRewatchCandidates = useMemo(() => {
    if (activeVibe === "all") return completedList;

    if (activeVibe === "short") {
      return completedList.filter(item => {
        const isMovie = item.format === "MOVIE";
        const isShortSeries = item.totalEpisodes && item.totalEpisodes <= 13;
        return isMovie || isShortSeries;
      });
    }

    const vibeDef = VIBE_FILTERS.find(v => v.id === activeVibe);
    if (!vibeDef || !vibeDef.genres) return completedList;

    return completedList.filter(item => {
      if (!item.genres || item.genres.length === 0) return true;
      return item.genres.some(g => vibeDef.genres.includes(g));
    });
  }, [completedList, activeVibe]);

  // Spotlight anime selected from candidates
  const spotlightAnime = useMemo(() => {
    if (filteredRewatchCandidates.length === 0) return null;
    const safeIdx = Math.abs(spotlightIndex) % filteredRewatchCandidates.length;
    return filteredRewatchCandidates[safeIdx];
  }, [filteredRewatchCandidates, spotlightIndex]);

  const handleRerollSpotlight = () => {
    if (filteredRewatchCandidates.length <= 1) return;
    setSpotlightIndex(prev => {
      let next;
      const currentMod = ((prev % filteredRewatchCandidates.length) + filteredRewatchCandidates.length) % filteredRewatchCandidates.length;
      do {
        next = Math.floor(Math.random() * filteredRewatchCandidates.length);
      } while (next === currentMod && filteredRewatchCandidates.length > 1);
      return next;
    });
  };

  // Generate dynamic contextual reason for rewatching
  const getRewatchReason = (anime) => {
    if (!anime) return "";
    const reasons = [];
    if (anime.rating) {
      reasons.push(`You rated this ${anime.rating}/10.`);
    }
    if (anime.format === "MOVIE") {
      reasons.push("Feature-length movie — perfect for a zero-commitment single-sitting revisit.");
    } else if (anime.totalEpisodes && anime.totalEpisodes <= 13) {
      reasons.push(`Compact run of only ${anime.totalEpisodes} episodes — easily bingeable in a weekend.`);
    } else if (anime.totalEpisodes) {
      reasons.push(`Complete ${anime.totalEpisodes}-episode story arc.`);
    }
    if (reasons.length === 0) {
      reasons.push("Marked as Completed in your library — ready to re-experience!");
    }
    return reasons.join(" ");
  };

  // ----------------------------------------------------
  // RECOMMENDATIONS TAB STATE & ENGINE
  // ----------------------------------------------------
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [genreLoading, setGenreLoading] = useState(false);
  const [peerClusters, setPeerClusters] = useState([]); // [{ anchorTitle, items: [] }]
  const [genreCluster, setGenreCluster] = useState({ genre: "", items: [] });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Set of all anime IDs already in user watchlist (never recommend what's already saved)
  const watchedIds = useMemo(() => {
    return new Set((watchlist || []).map(w => w.animeId || w.id));
  }, [watchlist]);

  // User's available genres computed from library, merged with popular options
  const availableGenres = useMemo(() => {
    const counts = {};
    (watchlist || []).forEach(item => {
      (item.genres || []).forEach(g => {
        counts[g] = (counts[g] || 0) + 1;
      });
    });
    const rankedFromLibrary = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(e => e[0]);

    // Unique combination: library ranked genres first, then popular fallbacks
    return Array.from(new Set([...rankedFromLibrary, ...POPULAR_GENRES]));
  }, [watchlist]);

  // Active genre filter for the genre section (defaults to user's top genre or 'Action')
  const [selectedGenre, setSelectedGenre] = useState("");

  useEffect(() => {
    if (!selectedGenre && availableGenres.length > 0) {
      setSelectedGenre(availableGenres[0]);
    }
  }, [availableGenres, selectedGenre]);

  // Load peer clusters based on completed titles
  const loadPeerClusters = useCallback(async () => {
    if (currentTab !== "recommendations") return;

    setRecommendationsLoading(true);
    try {
      const completedAnchors = [...completedList]
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

      const clusterPromises = completedAnchors.map(async (anchor) => {
        const peers = await fetchAnimeRecommendations(anchor.animeId || anchor.id);
        const unseenPeers = peers.filter(p => !watchedIds.has(p.id)).slice(0, 6);
        return {
          anchorTitle: anchor.title,
          items: unseenPeers
        };
      });

      const resolvedClusters = await Promise.all(clusterPromises);
      setPeerClusters(resolvedClusters.filter(c => c.items.length > 0));
    } catch (err) {
      console.error("Failed to load peer recommendations:", err);
    } finally {
      setRecommendationsLoading(false);
    }
  }, [currentTab, completedList, watchedIds]);

  // Load high-rated titles in the selected genre/tag
  const loadGenreCluster = useCallback(async (genreToFetch) => {
    if (currentTab !== "recommendations") return;
    const target = genreToFetch || selectedGenre || availableGenres[0] || "Action";

    setGenreLoading(true);
    try {
      const randomGenrePage = Math.floor(Math.random() * 3) + 1;
      const genreMedia = await fetchGenreRecommendations([target], randomGenrePage, 12);
      const unseenGenreItems = genreMedia.filter(m => !watchedIds.has(m.id)).slice(0, 6);

      setGenreCluster({
        genre: target,
        items: unseenGenreItems
      });
    } catch (err) {
      console.error("Failed to load genre recommendations:", err);
    } finally {
      setGenreLoading(false);
    }
  }, [currentTab, selectedGenre, availableGenres, watchedIds]);

  // Reroll both on tab change or New Suggestions trigger
  useEffect(() => {
    if (currentTab === "recommendations") {
      loadPeerClusters();
      loadGenreCluster(selectedGenre);
    }
  }, [currentTab, refreshTrigger]);

  // Switch genre immediately when user selects a different pill
  const handleSelectGenre = (genre) => {
    setSelectedGenre(genre);
    loadGenreCluster(genre);
  };

  const setTab = (tabName) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tabName);
    setSearchParams(next);
  };

  return (
    <div className="suggestions-container">
      {/* Header & Tabs */}
      <div className="suggestions-header">
        <div className="suggestions-title-row">
          <h1 className="suggestions-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent-primary, #6366f1)" }}>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            For You
          </h1>

          <div className="suggestions-header-actions">
            {currentTab === "rewatch" && filteredRewatchCandidates.length > 1 && (
              <button
                type="button"
                className="suggestions-refresh-btn"
                onClick={handleRerollSpotlight}
                title="Pick another random completed anime"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
                <span>Pick Another</span>
              </button>
            )}

            {currentTab === "recommendations" && (
              <button
                type="button"
                className="suggestions-refresh-btn"
                onClick={() => setRefreshTrigger(c => c + 1)}
                disabled={recommendationsLoading}
                title="Get fresh recommendation suggestions"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
                <span>{recommendationsLoading ? "Refreshing..." : "New Suggestions"}</span>
              </button>
            )}

            <div className="suggestions-tabs" role="tablist">
              <button
                type="button"
                className={`suggestions-tab-btn ${currentTab === "rewatch" ? "active" : ""}`}
                onClick={() => {
                  setTab("rewatch");
                  handleRerollSpotlight();
                }}
                role="tab"
                aria-selected={currentTab === "rewatch"}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
                <span>Rewatch</span>
              </button>

              <button
                type="button"
                className={`suggestions-tab-btn ${currentTab === "recommendations" ? "active" : ""}`}
                onClick={() => setTab("recommendations")}
                role="tab"
                aria-selected={currentTab === "recommendations"}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
                <span>Discover Recommendations</span>
              </button>
            </div>
          </div>
        </div>

        <p className="suggestions-subtitle">
          {currentTab === "rewatch"
            ? "Rediscover favorites from your completed watchlist — filtered by vibe without rating prejudice."
            : "Novel recommendations curated from your personal watch taste and chosen genres."}
        </p>
      </div>

      {/* =========================================================
          TAB 1: REWATCH
          ========================================================= */}
      {currentTab === "rewatch" && (
        <div className="rewatch-view">
          {/* Vibe Selection Pills (clean text, no emojis) */}
          <div className="rewatch-filter-bar">
            {VIBE_FILTERS.map(vibe => (
              <button
                key={vibe.id}
                type="button"
                className={`rewatch-pill ${activeVibe === vibe.id ? "active" : ""}`}
                onClick={() => {
                  setActiveVibe(vibe.id);
                  setSpotlightIndex(Math.floor(Math.random() * 10000));
                }}
              >
                <span>{vibe.label}</span>
              </button>
            ))}
          </div>

          {/* Spotlight Hero Card */}
          {spotlightAnime ? (
            <div className="rewatch-spotlight-card">
              <div className="spotlight-poster-wrap">
                <img
                  src={spotlightAnime.coverImage}
                  alt={spotlightAnime.title}
                  className="spotlight-poster"
                  loading="lazy"
                />
              </div>

              <div className="spotlight-info">
                <div>
                  <div className="spotlight-badge-row">
                    <span className="spotlight-badge">
                      Rewatch Pick
                    </span>
                    {spotlightAnime.format && (
                      <span className="spotlight-vibe-tag" style={{ margin: 0 }}>
                        {spotlightAnime.format}
                      </span>
                    )}
                    {spotlightAnime.totalEpisodes && (
                      <span className="spotlight-vibe-tag" style={{ margin: 0 }}>
                        {spotlightAnime.totalEpisodes} Ep{spotlightAnime.totalEpisodes > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  <h2 className="spotlight-title">{spotlightAnime.title}</h2>

                  <div className="spotlight-meta-row">
                    {spotlightAnime.rating ? (
                      <div className="spotlight-meta-item">
                        <span style={{ color: "#fbbf24" }}>★</span>
                        <span>Your Rating: {spotlightAnime.rating}/10</span>
                      </div>
                    ) : (
                      <div className="spotlight-meta-item">
                        <span>Completed in Library</span>
                      </div>
                    )}
                  </div>

                  <div className="spotlight-reason-box">
                    <strong>Why revisit this:</strong> {getRewatchReason(spotlightAnime)}
                  </div>
                </div>

                <div className="spotlight-actions">
                  <Link
                    to={`/anime/${spotlightAnime.animeId || spotlightAnime.id}`}
                    className="spotlight-watch-btn"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    <span>View & Rewatch</span>
                  </Link>

                  {filteredRewatchCandidates.length > 1 && (
                    <button
                      type="button"
                      className="spotlight-reroll-btn"
                      onClick={handleRerollSpotlight}
                      title="Pick another random completed anime"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                      </svg>
                      <span>Pick Another</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="suggestions-empty-state">
              <h3>No completed anime found for this vibe</h3>
              <p>
                Try switching to "All Completed" or complete more anime to build your rewatch candidate pool!
              </p>
              <Link to="/library" className="spotlight-watch-btn" style={{ display: "inline-flex" }}>
                Go to Library
              </Link>
            </div>
          )}

          {/* Grid of Other Candidates */}
          {filteredRewatchCandidates.length > 0 && (
            <div>
              <div className="suggestions-section-title">
                <span>All {activeVibe === "all" ? "Completed" : VIBE_FILTERS.find(v => v.id === activeVibe)?.label} Anime</span>
                <span className="suggestions-count-badge">
                  {filteredRewatchCandidates.length} title{filteredRewatchCandidates.length > 1 ? "s" : ""}
                </span>
              </div>

              <div className="anime-grid" style={{ padding: 0 }}>
                {filteredRewatchCandidates.map(anime => {
                  const animeCardFormat = {
                    id: anime.animeId || anime.id,
                    title: { english: anime.title, romaji: anime.title },
                    coverImage: { large: anime.coverImage, color: anime.color || "#6366f1" },
                    averageScore: anime.rating ? anime.rating * 10 : null,
                    episodes: anime.totalEpisodes,
                    format: anime.format,
                    genres: anime.genres || []
                  };
                  return <AnimeCard key={animeCardFormat.id} anime={animeCardFormat} />;
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 2: RECOMMENDATIONS
          ========================================================= */}
      {currentTab === "recommendations" && (
        <div className="recommendations-view">
          {/* Genre Selection Pills Bar */}
          <div className="genre-selector-bar">
            {availableGenres.slice(0, 10).map(genre => (
              <button
                key={genre}
                type="button"
                className={`genre-selector-pill ${selectedGenre === genre ? "active" : ""}`}
                onClick={() => handleSelectGenre(genre)}
              >
                <span>{genre}</span>
              </button>
            ))}
          </div>

          {/* Genre Cluster: User-chosen genre recommendations placed right at the top */}
          <div className="recommendations-cluster">
            <div className="recommendations-cluster-header">
              <div>
                <h2 className="recommendations-cluster-title">
                  <span>Top Rated in</span>
                  <span style={{ color: "var(--accent-primary, #6366f1)" }}>{selectedGenre || genreCluster.genre}</span>
                </h2>
                <p className="recommendations-cluster-desc">
                  Acclaimed {selectedGenre || genreCluster.genre} anime not yet on your watchlist.
                </p>
              </div>
            </div>

            {genreLoading ? (
              <div className="anime-grid" style={{ padding: 0 }}>
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="skeleton-card" />
                ))}
              </div>
            ) : genreCluster.items.length > 0 ? (
              <div className="anime-grid" style={{ padding: 0 }}>
                {genreCluster.items.map(anime => (
                  <AnimeCard key={anime.id} anime={anime} />
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: "10px 0" }}>
                No unseen titles found in this category.
              </p>
            )}
          </div>

          {recommendationsLoading && (
            <div className="anime-grid" style={{ padding: 0 }}>
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="skeleton-card" />
              ))}
            </div>
          )}

          {!recommendationsLoading && peerClusters.length === 0 && genreCluster.items.length === 0 && (
            <div className="suggestions-empty-state">
              <h3>Build your taste profile</h3>
              <p>
                Add and complete titles in your library to start receiving personalized recommendations based on your preferences.
              </p>
              <Link to="/discover" className="spotlight-watch-btn" style={{ display: "inline-flex" }}>
                Browse Catalog
              </Link>
            </div>
          )}

          {!recommendationsLoading && (
            <>
              {/* Peer Clusters: "Because you finished [Anchor Title]" */}
              {peerClusters.map((cluster, cIdx) => (
                <div key={cIdx} className="recommendations-cluster">
                  <div className="recommendations-cluster-header">
                    <div>
                      <h2 className="recommendations-cluster-title">
                        <span>Because you finished</span>
                        <span style={{ color: "var(--accent-primary, #6366f1)" }}>"{cluster.anchorTitle}"</span>
                      </h2>
                      <p className="recommendations-cluster-desc">
                        Titles that fans of {cluster.anchorTitle} also loved.
                      </p>
                    </div>
                  </div>

                  <div className="anime-grid" style={{ padding: 0 }}>
                    {cluster.items.map(anime => (
                      <AnimeCard key={anime.id} anime={anime} />
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
