import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import star from "../assets/star.png";
import "../styles/AnimeDetails.css";
import { useWatchlist } from "../context/WatchlistContext";

// Detect Tauri at module level (safe for both browser and desktop)
const isTauri = '__TAURI_INTERNALS__' in window;

export default function AnimeDetails() {
  const { id } = useParams();
  const { watchlist, addToWatchlist, updateWatchlistItem, removeFromWatchlist, touchWatchHistory } = useWatchlist();

  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const charactersListRef = useRef(null);
  const statusMenuRef = useRef(null);

  // Tauri Playback Modal State
  const [showPlayModal, setShowPlayModal] = useState(false);
  const [playTitle, setPlayTitle] = useState("");
  const [playEp, setPlayEp] = useState(1);
  const [epOffset, setEpOffset] = useState(0);
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
                                    image {
                                        large
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
        if (mediaData && mediaData.id) {
          touchWatchHistory(mediaData.id);
        }

        // Pre-calculate prequel episode offset in background for desktop companion
        if (isTauri && mediaData) {
          calculatePrequelOffset(mediaData).then((offset) => {
            setEpOffset(offset);
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

  // Recursively calculate total episodes from previous seasons (PREQUEL chain)
  const calculatePrequelOffset = async (initialMedia) => {
    let totalOffset = 0;
    let currentMedia = initialMedia;
    let visited = new Set([initialMedia.id]);

    while (currentMedia) {
      const prequelEdge = currentMedia.relations?.edges?.find(
        (e) => e.relationType === "PREQUEL" && e.node?.type === "ANIME" && e.node?.format !== "MUSIC"
      );
      if (!prequelEdge || !prequelEdge.node) break;

      const prequelNode = prequelEdge.node;
      if (visited.has(prequelNode.id)) break;
      visited.add(prequelNode.id);

      if (prequelNode.episodes) {
        totalOffset += prequelNode.episodes;
      }

      try {
        const q = `query ($id: Int) { Media(id: $id, type: ANIME) { id episodes relations { edges { relationType node { id episodes format type } } } } }`;
        const res = await fetch("https://graphql.anilist.co/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q, variables: { id: prequelNode.id } }),
        });
        const data = await res.json();
        currentMedia = data.data?.Media;
        if (!prequelNode.episodes && currentMedia?.episodes) {
          totalOffset += currentMedia.episodes;
        }
      } catch {
        break;
      }
    }
    return totalOffset;
  };

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
            style={{ marginTop: "15px" }}
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
                      onClick={() => updateWatchlistItem(savedAnime.animeId, { progress: savedAnime.progress + 1 })}
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

              {/* Tauri Desktop Companion */}
              {isTauri && (
                <button 
                  className="ops-play-btn"
                  style={{ width: "100%", marginTop: "10px", padding: "12px", backgroundColor: "#ff5252", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
                  onClick={async () => {
                    const isCompleted = savedAnime.totalEpisodes && savedAnime.progress >= savedAnime.totalEpisodes;
                    setPlayEp(isCompleted ? 1 : (savedAnime.progress + 1));
                    setPlayTitle(anime.title.english || anime.title.romaji);
                    setShowPlayModal(true);
                    if (anime) {
                      const offset = await calculatePrequelOffset(anime);
                      setEpOffset(offset);
                    }
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
              {isTauri && (
                <button 
                  className="ops-play-btn"
                  style={{ width: "100%", padding: "12px", backgroundColor: "#ff5252", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
                  onClick={async () => {
                    setPlayEp(1);
                    setPlayTitle(anime.title.english || anime.title.romaji);
                    setShowPlayModal(true);
                    if (anime) {
                      const offset = await calculatePrequelOffset(anime);
                      setEpOffset(offset);
                    }
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
                  return (
                    <Link 
                      to={related.type === "ANIME" ? `/anime/${related.id}` : '#'} 
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
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tauri Playback Settings Modal */}
      {showPlayModal && (
        <div className="modal-overlay" onClick={() => setShowPlayModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#1a1a2e', padding: '25px', borderRadius: '12px', width: '90%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', textAlign: 'center' }}>ani-cli Launcher</h2>
            
            {/* Search Title */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ color: '#aaa', fontSize: '0.85rem' }}>Search Title</label>
              <input 
                type="text" 
                value={playTitle} 
                onChange={(e) => setPlayTitle(e.target.value)} 
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #333', backgroundColor: '#0f0f1a', color: 'white', fontSize: '0.95rem' }}
              />
            </div>

            {/* Episode & Offset Calculation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" id="useAutoEp" checked={useAutoEp} onChange={(e) => setUseAutoEp(e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                <label htmlFor="useAutoEp" style={{ color: '#aaa', fontSize: '0.85rem', cursor: 'pointer' }}>Auto-calculate episode number</label>
              </div>

              {useAutoEp && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ color: '#aaa', fontSize: '0.8rem' }}>Current Season Ep</label>
                      <input 
                        type="number" 
                        value={playEp} 
                        onChange={(e) => setPlayEp(parseInt(e.target.value) || 1)} 
                        min="1" 
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid #333', backgroundColor: '#0f0f1a', color: 'white' }} 
                      />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ color: '#aaa', fontSize: '0.8rem' }}>Prev Seasons Offset</label>
                      <input 
                        type="number" 
                        value={epOffset} 
                        onChange={(e) => setEpOffset(parseInt(e.target.value) || 0)} 
                        min="0" 
                        placeholder="0"
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid #333', backgroundColor: '#0f0f1a', color: 'white' }} 
                      />
                    </div>
                  </div>
                  <div style={{ padding: '8px 12px', backgroundColor: '#131325', borderRadius: '6px', border: '1px solid #282845', fontSize: '0.82rem', color: '#68d391' }}>
                    🚀 ani-cli target: <strong>Episode {playEp + (parseInt(epOffset) || 0)}</strong> {epOffset > 0 ? `(${playEp} + ${epOffset} previous)` : ''}
                  </div>
                </div>
              )}

              {!useAutoEp && (
                <span style={{ color: '#666', fontSize: '0.8rem', fontStyle: 'italic' }}>You'll pick the episode in the terminal</span>
              )}
            </div>

            {/* Audio + Quality row */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ color: '#aaa', fontSize: '0.85rem' }}>Audio</label>
                <select value={playDub ? "dub" : "sub"} onChange={(e) => setPlayDub(e.target.value === "dub")} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #333', backgroundColor: '#0f0f1a', color: 'white' }}>
                  <option value="sub">Sub</option>
                  <option value="dub">Dub</option>
                </select>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ color: '#aaa', fontSize: '0.85rem' }}>Quality</label>
                <select value={playQuality} onChange={(e) => setPlayQuality(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #333', backgroundColor: '#0f0f1a', color: 'white' }}>
                  <option value="best">Best</option>
                  <option value="1080p">1080p</option>
                  <option value="720p">720p</option>
                  <option value="480p">480p</option>
                </select>
              </div>
            </div>

            {/* Toggles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={skipIntro} onChange={(e) => setSkipIntro(e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                <span style={{ color: '#ddd', fontSize: '0.85rem' }}>Skip intro (ani-skip, mpv only)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={autoSync} onChange={(e) => setAutoSync(e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                <span style={{ color: '#ddd', fontSize: '0.85rem' }}>Auto-track progress (≥70% watched)</span>
              </label>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
              <button 
                onClick={() => setShowPlayModal(false)}
                style={{ flex: 1, padding: '12px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Cancel
              </button>
              <button 
                disabled={isLaunching || !playTitle.trim()}
                onClick={async () => {
                  try {
                    setIsLaunching(true);
                    setShowPlayModal(false);
                    
                    const targetEp = useAutoEp ? (playEp + (parseInt(epOffset) || 0)) : null;
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
                        // If ani-cli passed continuous absolute ep number, subtract prequel offset to get current season episode
                        const seasonCalculatedEp = detectedEp ? Math.max(1, detectedEp - (parseInt(epOffset) || 0)) : null;

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
