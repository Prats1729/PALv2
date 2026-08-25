import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";

import { searchAnime } from "../../services/anilist";
import "../../styles/TopBar.css";
import searchIcon from "../../assets/search-button-svgrepo-com.svg";
import logo from "../../assets/pal-logo.svg";


export default function TopBar() {
  const navigate = useNavigate();
  const location = useLocation(); // Hook to watch current URL location
  const dropdownRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Close dropdown if user clicks outside of the search box
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
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
        const data = await searchAnime(searchQuery, 1, 5); // Limit to 5 quick results
        setResults(data);
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

  return (
    <div className="top-bar">
      <div className="left-section">
        <NavLink to="/" className="home-logo-link">
          <img className="home-logo" src={logo} alt="home-button" />
        </NavLink>
      </div>

      {/* Wrap search box and dropdown in a container for positioning */}
      <div className="middle-section" ref={dropdownRef}>
        <div className="search-container">
          <form className="search-box" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Quick search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim() !== "" && setIsOpen(true)}
              onKeyDown={handleKeyDown}
            />
            <button type="submit">
              <img src={searchIcon} alt="search" />
            </button>
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
        <NavLink
          to="/discover"
          className={({ isActive }) =>
            isActive ? "nav-link-active" : "nav-link"
          }
        >
          Discover
        </NavLink>
        <NavLink
          to={`/statistics`}
          className={({ isActive }) =>
            isActive ? "nav-link-active" : "nav-link"
          }
        >
          Stats
        </NavLink>
        <NavLink
          to={`/library`}
          className={({ isActive }) =>
            isActive ? "nav-link-active" : "nav-link"
          }
        >
          Library
        </NavLink>
        <NavLink
          to={`/settings`}
          className={({ isActive }) =>
            isActive ? "nav-link-active" : "nav-link"
          }
        >
          Settings
        </NavLink>

        {/* --- Profile Picture Placeholder --- */}
        <div 
          style={{ 
            marginLeft: "15px", 
            display: "flex", 
            alignItems: "center",
            paddingLeft: "15px",
            borderLeft: "1px solid rgba(255,255,255,0.1)"
          }}
          title="Logged in via PAL Backend"
        >
          <img 
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=PALUser&backgroundColor=6366f1" 
            alt="My Profile" 
            style={{ 
              width: "36px", 
              height: "36px", 
              borderRadius: "50%", 
              border: "2px solid #6366f1",
              boxShadow: "0 0 10px rgba(99, 102, 241, 0.3)",
              cursor: "pointer" 
            }}
          />
        </div>
      </div>
    </div>
  );
}
