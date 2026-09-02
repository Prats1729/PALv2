import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import star from "../assets/star.png";
import "../styles/AnimeDetails.css";
import { useWatchlist } from "../context/WatchlistContext";
import { getAnimeEpisodeMapping, getSuggestedTitles } from "../services/animeMapping";
import { platformCapabilities } from "../utils/platform";
import DOMPurify from "dompurify";

export default function AnimeDetails() {
  const { id } = useParams();
  const { watchlist, addToWatchlist, updateWatchlistItem, removeFromWatchlist } = useWatchlist();

  const [anime, setAnime] = useState(null);
  const [animeMapping, setAnimeMapping] = useState(null);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const charactersListRef = useRef(null);
  const statusMenuRef = useRef(null);

  // Tauri Playback Modal State
  const [showPlayModal, setShowPlayModal] = useState(false);
  const [playTitle, setPlayTitle] = useState("");
  const [playEp, setPlayEp] = useState(1);
  const [useAutoEp, setUseAutoEp] = useState(true);
  const [playDub, setPlayDub] = useState(false);
  const [playQuality, setPlayQuality] = useState("best");
  const [skipIntro, setSkipIntro] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [isLaunching, setIsLaunching] = useState(false);

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
  const savedAnime = anime ? watchlist.find(item => item.animeId === anime.id || String(item.animeId) === String(anime.id)) : null;
  const suggestedTitles = anime ? getSuggestedTitles(anime, animeMapping?.raw) : [];
  const hasDub = Boolean(
    anime?.characters?.edges?.some(
      (edge) => edge.dubActors && edge.dubActors.length > 0
    )
  );

  const [bannerError, setBannerError] = useState(false);

  const scrollCharacters = (direction) => {
    if (charactersListRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      charactersListRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (!id) return;
    window.scrollTo(0, 0);
    setBannerError(false);

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);

      // Simple GraphQL query for single anime with Sub/Dub voice actor detection
      const query = `
                query ($id: Int) {
                    Media(id: $id, type: ANIME) {
                        id
                        countryOfOrigin
                        title {
                            english
                            romaji
                            native
                        }
                        coverImage {
                            extraLarge
                            large
                            color
                        }
                        bannerImage
                        description
                        format
                        episodes
                        status
                        genres
                        averageScore
                        seasonYear
                        characters(sort: [ROLE, RELEVANCE], perPage: 25) {
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
                                    image {
                                        large
                                    }
                                }
                                dubActors: voiceActors(language: ENGLISH) {
                                    id
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
                                    episodes
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

        const mediaData = json.data.Media;
        setAnime(mediaData);

        // Load AniZip mapping in background for desktop playback
        if (platformCapabilities.playback && mediaData) {
          getAnimeEpisodeMapping(mediaData.id).then((mapping) => {
            if (mapping) setAnimeMapping(mapping);
          });
        }
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

  // Sanitize AniList HTML description with DOMPurify to eliminate XSS risks
  const descriptionHtml = DOMPurify.sanitize(anime.description || "No description available");

  return (
    <div className="details-container">
      {/* banner */}
      <div className="details-banner-wrapper">
        {anime.bannerImage && !bannerError ? (
          <img
            style={{ marginTop: "15px" }}
            src={anime.bannerImage}
            alt={anime.title.english || anime.title.romaji || "banner"}
            className="details-banner"
            onError={() => setBannerError(true)}
          />
        ) : (
          <div
            className="details-banner-ambient"
            style={{
              "--dominant-color": anime.coverImage?.color || "var(--accent-primary, #6366f1)",
            }}
          >
            <div className="details-ambient-glow" />
          </div>
        )}
      </div>

      <div className="details-content">
        <div className="details-left-col">
          <img
            src={anime.coverImage?.extraLarge || anime.coverImage?.large}
            alt={anime.title.english || anime.title.romaji}
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
                    {["Watching", "Plan to Watch", "Completed", "On Hold", "Dropped"].map(status => (
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
                  <div className="ops-progress-controls">
                    <button 
                      className="ops-progress-btn"
                      onClick={() => updateWatchlistItem(savedAnime.animeId, { progress: Math.max(0, savedAnime.progress - 1) })}
                      disabled={savedAnime.progress <= 0}
                      title="Watched one less episode"
                    >
                      -
                    </button>
                    <button 
                      className="ops-progress-btn"
                      onClick={() => {
                        const nextProgress = savedAnime.progress + 1;
                        const isCompleted = savedAnime.totalEpisodes && nextProgress >= savedAnime.totalEpisodes;
                        updateWatchlistItem(savedAnime.animeId, { 
                          progress: nextProgress,
                          status: isCompleted ? "Completed" : (savedAnime.status === "Plan to Watch" ? "Watching" : savedAnime.status),
                          lastWatchedAt: new Date().toISOString()
                        });
                      }}
                      disabled={savedAnime.totalEpisodes ? savedAnime.progress >= savedAnime.totalEpisodes : false}
                      title="Watched another episode"
                    >
                      +
                    </button>
                  </div>
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

              {/* User Score / Rating Selector */}
              <div className="ops-score-container" style={{ marginTop: '8px' }}>
                <div className="ops-score-row">
                  <div className="ops-score-label">
                    <img src={star} alt="score" style={{ width: '13px', height: '13px' }} />
                    <span>Your Rating</span>
                  </div>
                  <select
                    className="ops-score-select"
                    value={savedAnime.rating != null ? String(savedAnime.rating) : ""}
                    onChange={(e) => {
                      const val = e.target.value !== "" ? parseFloat(e.target.value) : null;
                      updateWatchlistItem(savedAnime.animeId, { rating: val });
                    }}
                  >
                    <option value="">No rating (-/10)</option>
                    {[10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5, 4.5, 4, 3, 2, 1].map((s) => (
                      <option key={s} value={s}>{s} / 10</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tauri Desktop Companion */}
              {platformCapabilities.playback && (
                <button 
                  className="ops-play-btn"
                  style={{ width: "100%", marginTop: "10px", padding: "12px", backgroundColor: "#ff5252", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
                  onClick={async () => {
                    const isCompleted = savedAnime.totalEpisodes && savedAnime.progress >= savedAnime.totalEpisodes;
                    const nextEp = isCompleted ? 1 : (savedAnime.progress + 1);
                    setPlayEp(nextEp);
                    if (!hasDub) setPlayDub(false);
                    const mapping = animeMapping || await getAnimeEpisodeMapping(anime.id);
                    if (mapping) setAnimeMapping(mapping);
                    const titles = getSuggestedTitles(anime, mapping?.raw);
                    setPlayTitle(titles[0] || anime.title.english || anime.title.romaji);
                    setShowPlayModal(true);
                  }}
                >
                  ▶ {(savedAnime.totalEpisodes && savedAnime.progress >= savedAnime.totalEpisodes) ? "Rewatch" : `Play Ep ${savedAnime.progress + 1}`}
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                className="ops-add-btn"
                onClick={() => addToWatchlist(anime)}
              >
                + Add to Watchlist
              </button>
              
              {/* Tauri Desktop Companion (for non-saved anime) */}
              {platformCapabilities.playback && (
                <button 
                  className="ops-play-btn"
                  style={{ width: "100%", padding: "12px", backgroundColor: "#ff5252", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
                  onClick={async () => {
                    setPlayEp(1);
                    if (!hasDub) setPlayDub(false);
                    const mapping = animeMapping || await getAnimeEpisodeMapping(anime.id);
                    if (mapping) setAnimeMapping(mapping);
                    const titles = getSuggestedTitles(anime, mapping?.raw);
                    setPlayTitle(titles[0] || anime.title.english || anime.title.romaji);
                    setShowPlayModal(true);
                  }}
                >
                  ▶ Play Ep 1
                </button>
              )}
            </div>
          )}
        </div>

        <div className="details-main-info">
          <h1>
            {anime.title.english || anime.title.romaji || anime.title.native}
          </h1>

          <div className="details-meta">
            <span>{anime.format || "TV"}</span>
            <span>•</span>
            <span>{anime.episodes || "?"} Episodes</span>
            <span>•</span>
            <span>{anime.seasonYear || "N/A"}</span>
            <div className="details-rating">
              <img src={star} alt="rating" />
              {anime.averageScore ? `${anime.averageScore / 10}` : "N/A"}
            </div>
            
            {/* Airing / Media Status */}
            {anime.status && (
              <span className={`details-airing-badge status-${anime.status.toLowerCase()}`}>
                {anime.status.replace(/_/g, " ")}
              </span>
            )}

            {/* Watchlist User Status */}
            <span className={`details-user-status-badge ${savedAnime ? 'saved' : 'not-saved'}`}>
              {savedAnime ? `✓ ${savedAnime.status}` : '+ Not in Watchlist'}
            </span>

            <div 
              className={`details-audio-badge ${hasDub ? "both" : "sub-only"}`}
              title={hasDub ? "Japanese Sub & English Dub available" : "Japanese Sub only (No official English Dub registered)"}
            >
              {hasDub ? "SUB | DUB" : "SUB"}
            </div>
          </div>

          <div className="genres-container">
            {anime.genres?.map((genre) => (
              <span key={genre} className="genre-badge">
                {genre}
              </span>
            ))}
          </div>

          <div className="details-synopsis-section">
            <h2>Synopsis</h2>
            <p className="details-synopsis" dangerouslySetInnerHTML={{ __html: descriptionHtml }}></p>
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
                    const va = edge.voiceActors?.[0];
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
                {anime.relations.edges.map((edge, index) => {
                  const related = edge.node;
                  const relationType = edge.relationType.replace(/_/g, ' ');
                  const isAnimeMedia = related.type === "ANIME";

                  if (isAnimeMedia) {
                    return (
                      <Link 
                        to={`/anime/${related.id}`} 
                        key={`${related.id}-${index}`} 
                        className="relation-item"
                      >
                        <div className="relation-info">
                          <div className="relation-type">{relationType}</div>
                          <div className="relation-title">{related.title.english || related.title.romaji}</div>
                        </div>
                        <div className="relation-arrow">›</div>
                      </Link>
                    );
                  }

                  return (
                    <div 
                      key={`${related.id}-${index}`} 
                      className="relation-item"
                      style={{ opacity: 0.6, cursor: "default" }}
                      title={`${related.type}: Not playable`}
                    >
                      <div className="relation-info">
                        <div className="relation-type">{relationType} ({related.type})</div>
                        <div className="relation-title">{related.title.english || related.title.romaji}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tauri Playback Settings Modal */}
      {showPlayModal && (
        <div className="pal-launcher-overlay" onClick={() => setShowPlayModal(false)}>
          <div className="pal-launcher-modal" onClick={(e) => e.stopPropagation()}>
            
            {/* Header */}
            <div className="pal-launcher-header">
              <div className="pal-launcher-title-group">
                <div className="pal-launcher-icon">▶</div>
                <h2 className="pal-launcher-title">Playback Companion</h2>
              </div>
              <button 
                className="pal-launcher-close-btn" 
                onClick={() => setShowPlayModal(false)}
                title="Close"
              >
                ✕
              </button>
            </div>
            
            {/* Search Title */}
            <div className="pal-launcher-field">
              <div className="pal-launcher-label-row">
                <label className="pal-launcher-label">Search Query</label>
                <span className="pal-launcher-sublabel">Select exact entry if needed</span>
              </div>
              <input 
                type="text" 
                className="pal-launcher-input"
                value={playTitle} 
                onChange={(e) => setPlayTitle(e.target.value)} 
                placeholder="Anime title..."
              />
              {suggestedTitles.length > 0 && (
                <div className="pal-launcher-pills">
                  {suggestedTitles.map((t, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPlayTitle(t)}
                      className={`pal-launcher-pill ${playTitle === t ? 'active' : ''}`}
                      title={`Search with: ${t}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Episode Selection Stepper */}
            <div className="pal-launcher-field">
              <div className="pal-launcher-label-row">
                <label className="pal-launcher-label">Season Episode</label>
                {animeMapping && animeMapping.getTargetEpisode(playEp) !== playEp ? (
                  <span className="pal-launcher-badge">
                    Auto-Mapped: Scraper Ep {animeMapping.getTargetEpisode(playEp)}
                  </span>
                ) : (
                  <span className="pal-launcher-sublabel">
                    Episode {playEp} {anime?.episodes ? `of ${anime.episodes}` : ''}
                  </span>
                )}
              </div>

              <div className="pal-launcher-stepper">
                <button 
                  type="button"
                  className="pal-launcher-stepper-btn"
                  onClick={() => setPlayEp(prev => Math.max(1, prev - 1))}
                  disabled={playEp <= 1}
                >
                  −
                </button>
                <input 
                  type="number" 
                  className="pal-launcher-stepper-input"
                  value={playEp} 
                  onChange={(e) => setPlayEp(Math.max(1, parseInt(e.target.value) || 1))} 
                  min="1" 
                  max={anime?.episodes || 9999}
                />
                <button 
                  type="button"
                  className="pal-launcher-stepper-btn"
                  onClick={() => setPlayEp(prev => Math.min(anime?.episodes || 9999, prev + 1))}
                  disabled={anime?.episodes && playEp >= anime.episodes}
                >
                  +
                </button>
              </div>
            </div>

            {/* Audio + Quality Row */}
            <div className="pal-launcher-segmented-group">
              {/* Audio Segmented Control */}
              <div className="pal-launcher-field">
                <div className="pal-launcher-label-row">
                  <label className="pal-launcher-label">Audio</label>
                  {!hasDub && (
                    <span className="pal-launcher-sublabel pal-launcher-na-hint">
                      Dub N/A
                    </span>
                  )}
                </div>
                <div className="pal-launcher-segmented">
                  <button 
                    type="button"
                    className={`pal-launcher-segment-btn ${!playDub ? 'active' : ''}`}
                    onClick={() => setPlayDub(false)}
                  >
                    Sub
                  </button>
                  <button 
                    type="button"
                    className={`pal-launcher-segment-btn ${playDub ? 'active' : ''}`}
                    onClick={() => {
                      if (hasDub) setPlayDub(true);
                    }}
                    disabled={!hasDub}
                    title={!hasDub ? "English Dub is not available for this anime" : "Switch to English Dub"}
                  >
                    Dub {!hasDub && <span className="pal-launcher-na-tag">(N/A)</span>}
                  </button>
                </div>
              </div>

              {/* Quality Select */}
              <div className="pal-launcher-field">
                <label className="pal-launcher-label">Quality</label>
                <div className="pal-launcher-select-wrapper">
                  <select 
                    className="pal-launcher-select"
                    value={playQuality} 
                    onChange={(e) => setPlayQuality(e.target.value)}
                  >
                    <option value="best">Best (1080p+)</option>
                    <option value="1080p">1080p</option>
                    <option value="720p">720p</option>
                    <option value="480p">480p</option>
                  </select>
                  <span className="pal-launcher-select-icon">▼</span>
                </div>
              </div>
            </div>

            {/* Toggles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div 
                className="pal-launcher-toggle-row"
                onClick={() => setSkipIntro(prev => !prev)}
              >
                <div className="pal-launcher-toggle-info">
                  <span className="pal-launcher-toggle-title">Skip Intro & Outro</span>
                  <span className="pal-launcher-toggle-desc">Automatic chapter skip (ani-skip, mpv)</span>
                </div>
                <div className={`pal-launcher-switch ${skipIntro ? 'checked' : ''}`}>
                  <div className="pal-launcher-switch-thumb" />
                </div>
              </div>

              <div 
                className="pal-launcher-toggle-row"
                onClick={() => setAutoSync(prev => !prev)}
              >
                <div className="pal-launcher-toggle-info">
                  <span className="pal-launcher-toggle-title">Auto-Track Progress</span>
                  <span className="pal-launcher-toggle-desc">Sync watchlist & history (≥70% watched)</span>
                </div>
                <div className={`pal-launcher-switch ${autoSync ? 'checked' : ''}`}>
                  <div className="pal-launcher-switch-thumb" />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pal-launcher-actions">
              <button 
                type="button"
                className="pal-launcher-btn-cancel"
                onClick={() => setShowPlayModal(false)}
              >
                Cancel
              </button>
              <button 
                type="button"
                className="pal-launcher-btn-launch"
                disabled={isLaunching || !playTitle.trim()}
                onClick={async () => {
                  try {
                    setIsLaunching(true);
                    setShowPlayModal(false);
                    
                    const mapping = animeMapping || await getAnimeEpisodeMapping(anime.id);
                    if (mapping) setAnimeMapping(mapping);
                    const targetEp = useAutoEp ? (mapping ? mapping.getTargetEpisode(playEp) : playEp) : null;
                    const resumeTime = (savedAnime && savedAnime.lastPosition > 15 && (playEp === (savedAnime.progress + 1) || playEp === savedAnime.progress))
                      ? savedAnime.lastPosition
                      : null;

                    // Dynamic import so @tauri-apps/api doesn't crash on web
                    const { invoke } = await import('@tauri-apps/api/core');
                    const rawResult = await invoke('play_anime', {
                      title: playTitle.trim(),
                      episode: targetEp,
                      isDub: playDub,
                      quality: playQuality,
                      skipIntro: skipIntro,
                      startTime: resumeTime,
                    });
                    
                    if (autoSync) {
                      let trackingData = { completed_count: 0, max_percent: 0, last_time_pos: 0, duration: 0 };
                      try {
                        trackingData = typeof rawResult === 'string' ? JSON.parse(rawResult) : (rawResult || {});
                      } catch {
                        trackingData = { completed_count: 1, max_percent: 100, last_time_pos: 0, duration: 0 };
                      }

                      const completedCount = trackingData.completed_count || 0;
                      const detectedEp = trackingData.last_completed_ep;
                      const maxPercent = trackingData.max_percent || 0;
                      const lastTimePos = trackingData.last_time_pos || 0;
                      const duration = trackingData.duration || 0;
                      
                      if (completedCount > 0 || detectedEp) {
                        // Universal AniZip season mapping
                        const seasonCalculatedEp = (detectedEp && mapping)
                          ? mapping.getSeasonEpisode(detectedEp, savedAnime?.totalEpisodes || anime?.episodes)
                          : (detectedEp ? Math.max(1, detectedEp) : null);

                        if (savedAnime) {
                          const newProgress = Math.min(
                            savedAnime.totalEpisodes || 9999,
                            seasonCalculatedEp ? Math.max(savedAnime.progress, seasonCalculatedEp) : (savedAnime.progress + completedCount)
                          );
                          const newStatus = (savedAnime.totalEpisodes && newProgress >= savedAnime.totalEpisodes)
                            ? "Completed"
                            : (savedAnime.status === "Plan to Watch" ? "Watching" : savedAnime.status);

                          updateWatchlistItem(savedAnime.animeId, {
                            progress: newProgress,
                            status: newStatus,
                            lastPosition: 0,
                            lastPercent: 0,
                            lastDuration: 0,
                            lastWatchedAt: new Date().toISOString()
                          });

                          window.dispatchEvent(new CustomEvent("pal-toast", {
                            detail: { 
                              message: `Auto-tracked: Episode ${newProgress} marked complete! (${completedCount} ep${completedCount > 1 ? 's' : ''} watched)`,
                              type: "success"
                            }
                          }));
                        } else {
                          const initialProgress = seasonCalculatedEp || completedCount || 1;
                          addToWatchlist(anime, "Watching");
                          setTimeout(() => {
                            updateWatchlistItem(anime.id, { 
                              progress: initialProgress, 
                              lastPosition: 0,
                              lastPercent: 0,
                              lastWatchedAt: new Date().toISOString() 
                            });
                          }, 300);
                          window.dispatchEvent(new CustomEvent("pal-toast", {
                            detail: { 
                              message: `Auto-tracked: Added to Watching and marked Ep ${initialProgress} complete!`,
                              type: "success"
                            }
                          }));
                        }
                      } else if (maxPercent >= 5 && lastTimePos > 15) {
                        // Mid-episode stop: save exact timestamp for resuming next time!
                        if (savedAnime) {
                          updateWatchlistItem(savedAnime.animeId, {
                            status: savedAnime.status === "Plan to Watch" ? "Watching" : savedAnime.status,
                            lastPosition: lastTimePos,
                            lastDuration: duration,
                            lastPercent: Math.round(maxPercent),
                            lastWatchedAt: new Date().toISOString()
                          });
                          const mins = Math.floor(lastTimePos / 60);
                          const secs = Math.floor(lastTimePos % 60).toString().padStart(2, '0');
                          window.dispatchEvent(new CustomEvent("pal-toast", {
                            detail: { 
                              message: `Saved position at ${mins}:${secs} (${Math.round(maxPercent)}%)`,
                              type: "info"
                            }
                          }));
                        }
                      } else if (maxPercent > 0) {
                        window.dispatchEvent(new CustomEvent("pal-toast", {
                          detail: { 
                            message: `Stopped at ${Math.round(maxPercent)}% (Need ≥70% to auto-advance).`,
                            type: "info"
                          }
                        }));
                      }
                    }
                  } catch (err) {
                    console.error("Tauri playback failed:", err);
                    alert("Failed to launch ani-cli. Ensure it is installed in WSL.");
                  } finally {
                    setIsLaunching(false);
                  }
                }}
                style={{ flex: 1, padding: '12px', backgroundColor: (!playTitle.trim() || isLaunching) ? '#993333' : '#ff5252', color: 'white', border: 'none', borderRadius: '8px', cursor: (!playTitle.trim() || isLaunching) ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
              >
                {isLaunching ? 'Playing...' : 'Launch'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
