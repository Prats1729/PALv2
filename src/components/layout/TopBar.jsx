import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

import { searchAnime } from "../../services/anilist";
import "../../styles/TopBar.css";
import searchIcon from "../../assets/search-button-svgrepo-com.svg";
import logo from "../../assets/pal-logo.svg";

export default function TopBar() {
  const navigate = useNavigate();
  const location = useLocation(); // Hook to watch current URL location
  const { logout, user } = useAuth();
  
  const dropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Close dropdowns if user clicks outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search logic inside the TopBar
  useEffect(() => {
    setSelectedIndex(-1); // Reset keyboard focus on text change
    if (searchQuery.trim() === "") {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setIsOpen(true);
      try {
        const data = await searchAnime(searchQuery, 1, 4); // Limit to 4 quick results
        setResults(data.media || []);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim() !== "") {
      setIsOpen(false);
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleItemClick = (id) => {
    setIsOpen(false);
    setSearchQuery("");
    navigate(`/anime/${id}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setSearchQuery("");
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && selectedIndex !== -1) {
      e.preventDefault();
      handleItemClick(results[selectedIndex].id);
    }
  };

  const searchInputRef = useRef(null);

  // Track if user can navigate back in React Router history
  const [canGoBack, setCanGoBack] = useState(() => Boolean(window.history.state?.idx > 0));

  useEffect(() => {
    setCanGoBack(Boolean(window.history.state?.idx > 0));
  }, [location]);

  const handleNavBack = () => {
    if (window.history.state?.idx > 0) {
      navigate(-1);
    } else if (location.pathname !== "/") {
      navigate("/");
    }
  };

  const handleNavForward = () => {
    navigate(1);
  };

  // Global Ctrl+K / Cmd+K and Alt+Arrow / Mouse navigation listeners
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Ctrl+K to search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Alt+Left/Right navigation shortcuts (skip if user is typing in an input/textarea)
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        handleNavBack();
      } else if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        handleNavForward();
      }
    };

    const handleMouseNav = (e) => {
      // Mouse 4 = Back, Mouse 5 = Forward
      if (e.button === 3) {
        e.preventDefault();
        handleNavBack();
      } else if (e.button === 4) {
        e.preventDefault();
        handleNavForward();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    window.addEventListener("mouseup", handleMouseNav);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
      window.removeEventListener("mouseup", handleMouseNav);
    };
  }, [location]);

  const [showDesktopModal, setShowDesktopModal] = useState(false);
  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      <div className="top-bar">
        <div className="left-section">
          <NavLink to="/" className="home-logo-link">
            <img className="home-logo" src={logo} alt="home-button" />
          </NavLink>

          <div className="topbar-nav-history desktop-only">
            <button
              type="button"
              className={`topbar-nav-btn ${!canGoBack ? "disabled" : ""}`}
              onClick={handleNavBack}
              title="Go Back (Alt+←)"
              aria-label="Back"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <button
              type="button"
              className="topbar-nav-btn"
              onClick={handleNavForward}
              title="Go Forward (Alt+→)"
              aria-label="Forward"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>

        {/* Wrap search box and dropdown in a container for positioning */}
        <div className="middle-section" ref={dropdownRef}>
          <div className="search-container">
            <form className="search-box" onSubmit={handleSubmit}>
              <div className="search-icon-prefix">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search anime..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.trim() !== "" && setIsOpen(true)}
                onKeyDown={handleKeyDown}
              />
              {searchQuery ? (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => {
                    setSearchQuery("");
                    setIsOpen(false);
                    searchInputRef.current?.focus();
                  }}
                  title="Clear"
                >
                  ✕
                </button>
              ) : (
                <div className="search-shortcut-badge" title="Press Ctrl+K to search">
                  <span>Ctrl</span>K
                </div>
              )}
            </form>

            {/* FLOATING DROPDOWN PANEL */}
            {isOpen && (
              <div className="search-dropdown">
                {loading && <div className="dropdown-status">Loading...</div>}
                {!loading && results.length === 0 && (
                  <div className="dropdown-status">No results found</div>
                )}

                {!loading &&
                  results.map((anime, idx) => (
                    <div
                      key={anime.id}
                      className={`dropdown-item ${idx === selectedIndex ? "active" : ""}`}
                      onClick={() => handleItemClick(anime.id)}
                    >
                      <img
                        src={anime.coverImage.large}
                        alt={anime.title.english}
                        className="dropdown-thumb"
                      />
                      <div className="dropdown-info">
                        <div className="dropdown-title">
                          {anime.title.english ||
                            anime.title.romaji ||
                            anime.title.native}
                        </div>
                        <div className="dropdown-meta">
                          {anime.seasonYear ? anime.seasonYear : ""} •{" "}
                          {anime.format}
                        </div>
                      </div>
                    </div>
                  ))}

                {results.length > 0 && (
                  <div className="dropdown-footer" onClick={handleSubmit}>
                    VIEW ALL →
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="right-section">
          {!isTauri && (
            <button
              type="button"
              className="desktop-only"
              onClick={() => setShowDesktopModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#e2e8f0",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "background-color 0.2s ease, border-color 0.2s ease",
                boxShadow: "none"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
              }}
              title="Get PALv2 Desktop App for Windows"
            >
              Desktop App
            </button>
          )}

          <NavLink
            to="/discover"
            className={({ isActive }) =>
              isActive ? "nav-link-active desktop-only" : "nav-link desktop-only"
            }
          >
            Discover
          </NavLink>
          <NavLink
            to={`/library`}
            onClick={(e) => {
              if (!isTauri && user?.isGuest) {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent("pal-auth-prompt", {
                  detail: {
                    message: "Sign in or create a free account to access your personal watchlist library."
                  }
                }));
              }
            }}
            className={({ isActive }) =>
              isActive ? "nav-link-active desktop-only" : "nav-link desktop-only"
            }
          >
            Library
          </NavLink>

          {/* --- Profile Picture & Dropdown --- */}
          {user ? (
            <div 
              className="profile-menu-container" 
              ref={profileDropdownRef}
              style={{ 
                marginLeft: "15px", 
                paddingLeft: "15px",
                borderLeft: "1px solid rgba(255,255,255,0.1)",
                position: "relative"
              }}
            >
              <img 
                src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}&backgroundColor=6366f1`} 
                alt="My Profile" 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                style={{ 
                  width: "34px", 
                  height: "34px", 
                  borderRadius: "50%", 
                  border: "1px solid rgba(255,255,255,0.2)",
                  boxShadow: "none",
                  cursor: "pointer",
                  display: "block",
                  objectFit: "cover"
                }}
              />
              
              {isProfileOpen && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-item" onClick={() => { setIsProfileOpen(false); navigate('/profile'); }}>
                    Profile {user.isGuest && "(Guest)"}
                  </div>
                  <div className="profile-dropdown-item" onClick={() => { setIsProfileOpen(false); navigate('/settings'); }}>
                    Settings
                  </div>
                  <div className="profile-dropdown-item logout" onClick={handleLogout}>
                    Logout
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginLeft: "15px", paddingLeft: "15px", borderLeft: "1px solid rgba(255,255,255,0.1)", display: 'flex', gap: '10px' }}>
              <NavLink to="/login" className="nav-link" style={{ fontSize: '14px', fontWeight: 'bold' }}>Login</NavLink>
              <NavLink to="/register" className="nav-link" style={{ fontSize: '14px', fontWeight: 'bold', color: '#6366f1' }}>Sign Up</NavLink>
            </div>
          )}
        </div>
      </div>

      {/* DESKTOP APP MODAL */}
      {showDesktopModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
          onClick={() => setShowDesktopModal(false)}
        >
          <div
            style={{
              backgroundColor: "#14111d",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "12px",
              maxWidth: "480px",
              width: "100%",
              padding: "24px",
              boxShadow: "none",
              color: "#fff",
              position: "relative"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowDesktopModal(false)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "transparent",
                border: "none",
                color: "#888",
                fontSize: "18px",
                cursor: "pointer"
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "#fff"}
              onMouseLeave={(e) => e.currentTarget.style.color = "#888"}
            >
              ✕
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <img src={logo} alt="PAL Logo" style={{ height: "26px" }} />
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>
                PALv2 Desktop Edition
              </h3>
            </div>

            <p style={{ color: "#94a3b8", fontSize: "13px", lineHeight: "1.5", margin: "0 0 16px 0" }}>
              The desktop companion enables native local playback with zero ads, hardware-accelerated video, and automatic tracking.
            </p>

            {/* Feature Highlights */}
            <div style={{ backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "14px", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#a5b4fc", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Desktop Features
              </div>
              <ul style={{ margin: 0, paddingLeft: "18px", color: "#e2e8f0", fontSize: "12px", lineHeight: "1.7" }}>
                <li><strong>Local Hardware-Accelerated Playback:</strong> High-performance MPV video rendering with zero web ads.</li>
                <li><strong>Direct Stream Extraction:</strong> Powered directly by <a href="https://github.com/pystardust/ani-cli" target="_blank" rel="noreferrer" style={{ color: "#818cf8", textDecoration: "underline" }}>ani-cli</a>.</li>
                <li><strong>Automatic Episode Tracking:</strong> Marks episodes complete at ≥70% and resumes from exact timestamps.</li>
              </ul>
            </div>

            {/* Prerequisites notice */}
            <div style={{ backgroundColor: "rgba(255, 255, 255, 0.02)", borderRadius: "8px", padding: "12px 14px", border: "1px solid rgba(255, 255, 255, 0.06)", marginBottom: "20px" }}>
              <p style={{ color: "#94a3b8", fontSize: "12px", margin: 0, lineHeight: "1.5" }}>
                Requires <a href="https://github.com/pystardust/ani-cli" target="_blank" rel="noreferrer" style={{ color: "#a5b4fc", textDecoration: "underline" }}>ani-cli</a> and <a href="https://mpv.io/" target="_blank" rel="noreferrer" style={{ color: "#a5b4fc", textDecoration: "underline" }}>mpv</a> installed on your system.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <a
                href="https://github.com/Prats1729/PALv2/releases"
                target="_blank"
                rel="noreferrer"
                style={{
                  flex: 1,
                  backgroundColor: "#6366f1",
                  color: "#fff",
                  textAlign: "center",
                  padding: "10px 16px",
                  borderRadius: "6px",
                  textDecoration: "none",
                  fontWeight: "600",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "none",
                  transition: "background-color 0.2s ease"
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#4f46e5"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#6366f1"}
              >
                ⬇ Download (.exe)
              </a>
              <button
                type="button"
                onClick={() => setShowDesktopModal(false)}
                style={{
                  padding: "10px 16px",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  color: "#e2e8f0",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "6px",
                  fontWeight: "600",
                  fontSize: "13px",
                  cursor: "pointer",
                  boxShadow: "none",
                  transition: "background-color 0.2s ease"
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.12)"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)"}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
