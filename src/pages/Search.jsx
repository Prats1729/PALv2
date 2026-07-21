import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { searchAnime } from "../services/anilist";

export default function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    searchAnime(query)
      .then((data) => setResults(data))
      .catch((err) => setError(err.message || "Failed to search anime."))
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <h2 style={{ color: "#fff", fontSize: "28px", marginBottom: "8px" }}>
        Search Results {query && `for "${query}"`}
      </h2>

      {loading ? (
        <div className="anime-grid" style={{ padding: 0, marginTop: "20px" }}>
          {Array.from({ length: 10 }).map((_, idx) => (
            <div key={idx} className="skeleton-card" />
          ))}
        </div>
      ) : (
        <div className="anime-grid" style={{ padding: 0, marginTop: "20px" }}>
          {results.map((anime) => {
            const cardColor = anime.coverImage?.color || "#6366f1";
            const title = anime.title.english || anime.title.romaji;

            return (
              <Link
                key={anime.id}
                to={`/anime/${anime.id}`}
                className="card-link"
                style={{ "--hover-color": cardColor }}
              >
                <div className="anime-card">
                  <img src={anime.coverImage?.large} alt={title} loading="lazy" />
                  <div className="anime-title">{title}</div>
                  <div className="extra-info">
                    <p className="format">{anime.format || "TV"}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {error && <p style={{ color: "#ef4444" }}>{error}</p>}

      {!loading && results.length === 0 && query && (
        <p style={{ color: "#aaa" }}>No anime found for "{query}".</p>
      )}

    </div>
  );
}
