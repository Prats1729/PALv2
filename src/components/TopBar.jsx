import { useState, useEffect } from "react";
import "../styles/TopBar.css";
import searchIcon from "../assets/search-button-svgrepo-com.svg"

export default function TopBar({ onSearch }) {
    const [searchQuery, setSearchQuery] = useState("");

    const handleSubmit = (e) => {
      e.preventDefault();
      if (onSearch) {
        onSearch(searchQuery);
      }
    }
  
    return (
    <div className="top-bar">
      <div className="left-section"></div>
      <div className="middle-section">
        <form className="search-box" onSubmit={handleSubmit}>
          <input type="text" placeholder="eg. Attack On Titan" value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} />
          <button type="submit">
            <img src={searchIcon} alt="search" />
          </button>
        </form>
      </div>
      <div className="right-section"></div>
    </div>
  );
}    