import { useState, useEffect } from "react";

import TopBar from "./components/layout/TopBar";
import { searchAnime } from "./services/anilist";
import "./App.css";
import star from "./assets/star.png"



export default function App() {
  // query holds the active search string that is submitted from the search bar.
  // This state is set when the user clicks search/hits Enter in the TopBar.
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);


  useEffect(() => {
    // if query  is empty, clear the previous results and stop
    if (!query) {
      setResults([]);
      setError(null);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      setError(null);
      try{
        const data = await searchAnime(query);
        setResults(data); // save teh anime array to state
      } catch (error){
        setError(error.message || "Failed to fetch anime");
      } finally {
        setLoading(false);
      }
    }

    performSearch();  // call teh search function defined above
  
  }, [query]); // Only re-run if 'query' changes


  // This is the callback function we pass down to TopBar.
  // When TopBar submits a search, it calls this function, giving us the searchQuery text.
  const handleSearch = (searchQuery) => {
    setQuery(searchQuery);
    console.log("App received search query:", searchQuery);
  };

  return (
    <div>
      {/* We pass handleSearch to the TopBar component under the 'onSearch' prop name */}
      <TopBar onSearch={handleSearch} />
      <div className="main-content">
        {query && <p>Search results for: {query}</p>}
        {/* SHow loading text while fetching*/}
        {loading && <p>Loading...</p>}
        
        {/*show error if it failed */}
        {error && <p style={{color:"red"}}>{error}</p>}
        
        {/* Render the grid of anime cards */}
        <div className="anime-grid">
          {/* Use map to iterate over the results array */}
          {results.map((anime) => (
            <div key={anime.id} className="anime-card">
              <img src={anime.coverImage.large} alt={anime.title.english} />
              <div className="anime-title">{anime.title.english || anime.title.romaji || anime.title.native}</div>
              <div className="score"><img src={star} alt="star" />{anime.averageScore ? `${anime.averageScore/10}` : "N/A"}</div>
              <div className="extra-info">
                <p className="format">{anime.format}</p>
                <p className="episodes">
                  {anime.nextAiringEpisode
                    ? `${anime.nextAiringEpisode.episode - 1} / ${anime.episodes || "?"}`
                    : `${anime.episodes || "?"} / ${anime.episodes || "?"}`}
                </p>
              </div>
                
              
            </div>
          ))}
          
        </div>

      </div>
    </div>
  );
}
