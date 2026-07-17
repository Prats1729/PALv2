import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { searchAnime } from "../../services/anilist";
import "../../styles/TopBar.css";
import searchIcon from "../../assets/search-button-svgrepo-com.svg";
import logo from "../../assets/pal-logo.svg";
import discoverLogo from "../../assets/discover-svgrepo-com.svg";
import statisticsLogo from "../../assets/statistics-svgrepo-com.svg";
import libraryLogo from "../../assets/open-book-svgrepo-com.svg";
import settingLogo from "../../assets/settings-svgrepo-com (1).svg";

export default function TopBar() {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

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
      navigate(`/discover?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleItemClick = (id) => {
    setIsOpen(false);
    setSearchQuery("");
    navigate(`/anime/${id}`);
  };

  return (
    <div className="top-bar">
      <div className="left-section">
        <NavLink
          to="/"
          className={({ isActive }) =>
            isActive ? "nav-link-active" : "nav-link"
          }
        >
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
                results.map((anime) => (
                  <div
                    key={anime.id}
                    className="dropdown-item"
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
          <img src={discoverLogo} alt="discover-button" />
        </NavLink>
        <NavLink
          to="/statistics"
          className={({ isActive }) =>
            isActive ? "nav-link-active" : "nav-link"
          }
        >
          <img src={statisticsLogo} alt="statistics-button" />
        </NavLink>
        <NavLink
          to="/library"
          className={({ isActive }) =>
            isActive ? "nav-link-active" : "nav-link"
          }
        >
          <img src={libraryLogo} alt="library-button" />
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            isActive ? "nav-link-active" : "nav-link"
          }
        >
          <img src={settingLogo} alt="setting-button" />
        </NavLink>
      </div>
    </div>
  );
}
