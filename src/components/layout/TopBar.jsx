import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import "../../styles/TopBar.css";
import searchIcon from "../../assets/search-button-svgrepo-com.svg";
import logo from "../../assets/pal-logo.svg";
import discoverLogo from "../../assets/discover-svgrepo-com.svg";
import statisticsLogo from "../../assets/statistics-svgrepo-com.svg";
import libraryLogo from "../../assets/open-book-svgrepo-com.svg";
import settingLogo from "../../assets/settings-svgrepo-com (1).svg";


// TopBar receives the 'onSearch' callback function as a prop from Home.jsx.
export default function TopBar({ onSearch }) {
  // Local state to keep track of what the user is typing in the input box.
  const [searchQuery, setSearchQuery] = useState("");

  // This runs when the form is submitted (user clicks search or presses Enter).
  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(searchQuery);
    }, 500); // 500ms debounce delay

    return () => clearTimeout(timer);
  }, [searchQuery, onSearch]);

  return (
    <div className="top-bar">
      <div className="left-section">
        {/** Navigation links for the left side of the TopBar */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            isActive ? "nav-link-active" : "nav-link"
          }
        >
        <img className="home-logo" src={logo} alt="home-button" />
        </NavLink>

        
      </div>

      <div className="middle-section">
        <form className="search-box" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="eg. Attack On Titan"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit">
            <img src={searchIcon} alt="search" />
          </button>
        </form>
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
