import { useState, useEffect } from "react";
import "../../styles/TopBar.css";
import searchIcon from "../../assets/search-button-svgrepo-com.svg"

// TopBar receives the 'onSearch' callback function as a prop from App.jsx.
// This allows TopBar to send the search text back up to the parent component.
export default function TopBar({ onSearch }) {
    // Local state to keep track of what the user is typing in the input box.
    const [searchQuery, setSearchQuery] = useState("");

    // This runs when the form is submitted (user clicks search or presses Enter).
    const handleSubmit = (e) => {
      // Prevent the browser's default behavior of reloading the page on submit.
      e.preventDefault();
      
      // If the parent passed an 'onSearch' function, call it with the typed query.
      if (onSearch) {
        onSearch(searchQuery);
      }
    }

    // Debounce search input
    useEffect(() => {
      // Setup a timer that will wait for 500ms after the user stops typing
      const timer = setTimeout(()=>{
        onSearch(searchQuery);
      }, 500); // 500ms debounce delay
      // Cleanup function: this runs if the component unmounts
      // or if the effect runs again (due to searchQuery changing)
      // This prevents the timer from running if the user types again quickly.
      return () => clearTimeout(timer);
    }, [searchQuery, onSearch]);
  
    return (
    <div className="top-bar">
      <div className="left-section"></div>


      <div className="middle-section">
        {/* The form listens to onSubmit to capture both button click and Enter key */}
        <form className="search-box" onSubmit={handleSubmit}>
          {/* onChange updates our local searchQuery state on every keystroke */}
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


      
      <div className="right-section"></div>
    </div>
  );
}    
