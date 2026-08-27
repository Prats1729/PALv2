import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { searchAnime } from "../services/anilist";
import Pagination from "../components/common/Pagination";
import AnimeCard from "../components/common/AnimeCard";

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
    <div style={{ padding: "24px 20px 40px 20px", boxSizing: "border-box" }}>
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
          {results.map((anime) => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      )}

      {!loading && !error && results.length > 0 && pageInfo && (
        <Pagination
          currentPage={pageInfo.currentPage}
          totalPages={Math.ceil(pageInfo.total / 12)}
          onPageChange={handlePageChange}
        />
      )}

      {error && <p style={{ color: "#ef4444" }}>{error}</p>}

      {!loading && results.length === 0 && query && (
        <p style={{ color: "#aaa" }}>No anime found for "{query}".</p>
      )}

    </div>
  );
}
