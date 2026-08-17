import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { searchAnime } from "../services/anilist";

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page")) || 1;

  const [results, setResults] = useState([]);
  const [pageInfo, setPageInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    searchAnime(query, page)
      .then((data) => {
        setResults(data.media);
        setPageInfo(data.pageInfo);
      })
      .catch((err) => setError(err.message || "Failed to search anime."))
      .finally(() => setLoading(false));
  }, [query, page]);

  const handlePageChange = (newPage) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", newPage);
    setSearchParams(newParams);
    window.scrollTo(0, 0);
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <h2 className="search-title">
        Search Results {query && `for "${query}"`}
      </h2>
      {!loading && !error && pageInfo?.total !== undefined && (
        <p style={{ color: "#aaa", marginTop: "-10px", marginBottom: "20px" }}>
          Found {pageInfo.total} anime
        </p>
      )}

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

      {!loading && !error && results.length > 0 && pageInfo && (
        <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '30px', marginBottom: '20px' }}>
          <button 
            onClick={() => handlePageChange(page - 1)} 
            disabled={page === 1}
            style={{ padding: '8px 16px', cursor: page === 1 ? 'not-allowed' : 'pointer', background: '#333', color: '#fff', border: 'none', borderRadius: '4px' }}
          >
            Previous
          </button>
          <span style={{ padding: '8px 16px', background: '#222', borderRadius: '4px' }}>Page {page}</span>
          <button 
            onClick={() => handlePageChange(page + 1)} 
            disabled={!pageInfo.hasNextPage}
            style={{ padding: '8px 16px', cursor: !pageInfo.hasNextPage ? 'not-allowed' : 'pointer', background: '#333', color: '#fff', border: 'none', borderRadius: '4px' }}
          >
            Next
          </button>
        </div>
      )}

      {error && <p style={{ color: "#ef4444" }}>{error}</p>}

      {!loading && results.length === 0 && query && (
        <p style={{ color: "#aaa" }}>No anime found for "{query}".</p>
      )}

    </div>
  );
}
