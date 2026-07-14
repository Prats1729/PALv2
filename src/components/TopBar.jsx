import "../styles/TopBar.css";
import searchIcon from "../assets/search-button-svgrepo-com.svg"

export default function TopBar() {
  return (
    <div className="top-bar">
      <div className="left-section"></div>
      <div className="middle-section">
        <div className="search-box">
          <form action="get">
            <input type="text" placeholder="eg. Attack On Titan" />
            <button type="submit">
              <img src={searchIcon} alt="search" />
            </button>
          </form>
        </div>
      </div>
      <div className="right-section"></div>
    </div>
  );
}    