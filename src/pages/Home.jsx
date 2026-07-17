import { useState, useEffect } from "react";
import TopBar from "../components/layout/TopBar";
import { searchAnime } from "../services/anilist";
import star from "../assets/star.png";

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If query is empty, clear the previous results and stop
    if (!query) {
      setResults([]);
      setError(null);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await searchAnime(query);
        setResults(data); // save the anime array to state
      } catch (err) {
        setError(err.message || "Failed to fetch anime");
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [query]);

  // Callback function passed to TopBar
  const handleSearch = (searchQuery) => {
    setQuery(searchQuery);
    console.log("Home received search query:", searchQuery);
  };

  return (
    <div>
      <TopBar onSearch={handleSearch} />
      <div className="main-content">
        {query && <p>Search results for: {query}</p>}
        {loading && <p>Loading...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}
        
        <div className="anime-grid">
          {results.map((anime) => (
            <div key={anime.id} className="anime-card">
              <img src={anime.coverImage.large} alt={anime.title.english || "Anime Cover"} />
              <div className="anime-title">
                {anime.title.english || anime.title.romaji || anime.title.native}
              </div>
              <div className="score">
                <img src={star} alt="star" />
                {anime.averageScore ? `${anime.averageScore / 10}` : "N/A"}
              </div>
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
