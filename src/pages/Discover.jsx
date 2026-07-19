import { useState, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import star from "../assets/star.png";
import "../styles/Discover.css";

// 1. REUSABLE CUSTOM MULTI-SELECT DROPDOWN COMPONENT
function MultiSelectDropdown({ label, options, selected, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (option) => {
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const displayLabel = selected.length === 0 ? "Any" : selected.join(", ");

  return (
    <div className="filter-group" ref={dropdownRef}>
      <label>{label}</label>
      <div className="custom-dropdown">
        <button
          type="button"
          className={`dropdown-trigger ${isOpen ? "open" : ""}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="dropdown-value">{displayLabel}</span>
          <span className="chevron-arrow"></span>
        </button>

        {isOpen && (
          <div className="dropdown-options-list">
            {options.map((opt) => {
              const isChecked = selected.includes(opt);
              return (
                <label
                  key={opt}
                  className={`dropdown-option-item ${isChecked ? "checked" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleOption(opt)}
                  />
                  <span>{opt.replace(/_/g, " ")}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// 2. MAIN CATALOG PAGE
export default function Discover() {
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") || "";

  // Filter States
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedFormats, setSelectedFormats] = useState([]);
  const [season, setSeason] = useState("");
  const [selectedStatus, setSelectedStatus] = useState([]);
  const [year, setYear] = useState(""); // Single string state
  const [sortBy, setSortBy] = useState("POPULARITY_DESC");

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setSearchQuery(urlQuery);
  }, [urlQuery]);

  // Fetch from AniList API on filter changes
  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true);
      setError(null);

      // Changed: $year as Int, and seasonYear: $year
      const queryStr = `
        query (
          $search: String, 
          $genres: [String], 
          $tags: [String],
          $formats: [MediaFormat], 
          $season: MediaSeason,
          $status: [MediaStatus], 
          $year: Int, 
          $sort: [MediaSort]
        ) {
          Page(page: 1, perPage: 24) {
            media(
              search: $search,
              genre_in: $genres,
              tag_in: $tags,
              format_in: $formats,
              season: $season,
              status_in: $status,
              seasonYear: $year,
              sort: $sort,
              type: ANIME
            ) {
              id
              title { english romaji native }
              coverImage { large color }
              averageScore
              format
              episodes
              status
            }
          }
        }
      `;

      const variables = {
        sort: [sortBy],
      };
      if (searchQuery.trim() !== "") variables.search = searchQuery;
      if (selectedGenres.length > 0) variables.genres = selectedGenres;
      if (selectedTags.length > 0) variables.tags = selectedTags;
      if (selectedFormats.length > 0) variables.formats = selectedFormats;
      if (season !== "") variables.season = season;
      if (selectedStatus.length > 0) variables.status = selectedStatus;
      if (year !== "") variables.year = parseInt(year); // Single Int variable

      try {
        const response = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: queryStr, variables }),
        });

        const json = await response.json();
        if (json.errors) {
          throw new Error(json.errors[0].message);
        }
        setResults(json.data.Page.media);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
  }, [
    searchQuery,
    selectedGenres,
    selectedTags,
    selectedFormats,
    season,
    selectedStatus,
    year,
    sortBy,
  ]);

  // Clear All Filters
  const handleClearAll = () => {
    setSearchQuery("");
    setSelectedGenres([]);
    setSelectedTags([]);
    setSelectedFormats([]);
    setSeason("");
    setSelectedStatus([]);
    setYear("");
    setSortBy("POPULARITY_DESC");
  };

  // Option Lists
  const genresList = [
    "Action",
    "Adventure",
    "Comedy",
    "Drama",
    "Fantasy",
    "Horror",
    "Mystery",
    "Romance",
    "Sci-Fi",
    "Slice of Life",
    "Sports",
    "Supernatural",
    "Thriller",
    "Psychological",
    "Mecha",
  ];
  const tagsList = [
    "Isekai",
    "Harem",
    "Survival",
    "Cyberpunk",
    "Time Travel",
    "Magic",
    "Military",
    "School",
    "Post-Apocalyptic",
    "Historical",
  ];
  const formatsList = ["TV", "MOVIE", "SPECIAL", "OVA", "ONA"];
  const seasonsList = ["WINTER", "SPRING", "SUMMER", "FALL"];
  const statusList = ["FINISHED", "RELEASING", "NOT_YET_RELEASED", "CANCELLED"];
  const yearsList = Array.from({ length: 30 }, (_, i) =>
    (new Date().getFullYear() - i).toString(),
  );

  return (
    <div className="main-content">
      <h1 className="catalog-title">Catalog</h1>

      {/* FILTER BAR GRID */}
      <div className="filter-bar">
        <div className="filter-grid-row">
          <MultiSelectDropdown
            label="Genre"
            options={genresList}
            selected={selectedGenres}
            onChange={setSelectedGenres}
          />
          <MultiSelectDropdown
            label="Tags"
            options={tagsList}
            selected={selectedTags}
            onChange={setSelectedTags}
          />
          <MultiSelectDropdown
            label="Format"
            options={formatsList}
            selected={selectedFormats}
            onChange={setSelectedFormats}
          />

          {/* Year Selector (Single Select Dropdown) */}
          <div className="filter-group">
            <label>Year</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="standard-select"
            >
              <option value="">Any</option>
              {yearsList.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Season Selector (Single Select Dropdown) */}
          <div className="filter-group">
            <label>Season</label>
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="standard-select"
            >
              <option value="">Any</option>
              {seasonsList.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <MultiSelectDropdown
            label="Status"
            options={statusList}
            selected={selectedStatus}
            onChange={setSelectedStatus}
          />

          <div className="filter-group">
            <label>Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="standard-select"
            >
              <option value="POPULARITY_DESC">Popularity</option>
              <option value="SCORE_DESC">Score</option>
              <option value="TRENDING_DESC">Trending Now</option>
              <option value="START_DATE_DESC">Release Date</option>
              <option value="END_DATE_DESC">Completed Date</option>
              <option value="TITLE_ENGLISH_DESC">Title</option>
            </select>
          </div>
        </div>

        <div className="filter-grid-row bottom-row">
          <div className="filter-group search-filter">
            <label>Search</label>
            <div className="search-input-wrapper">
              <input
                type="text"
                placeholder="Search anime..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <button className="clear-all-btn" onClick={handleClearAll}>
            Clear
          </button>
        </div>
      </div>

      {/* RENDER GRID */}
      {loading && <p className="home-loading">Filtering catalog...</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      {!loading && !error && (
        <div className="anime-grid" style={{ padding: "20px 0 0 0" }}>
          {results.map((anime) => {
            const cardColor = anime.coverImage.color || "#6366f1";
            return (
              <Link
                to={`/anime/${anime.id}`}
                key={anime.id}
                className="card-link"
                style={{ "--hover-color": cardColor }}
              >
                <div className="anime-card">
                  <img src={anime.coverImage.large} alt={anime.title.english} />
                  <div className="anime-title">
                    {anime.title.english || anime.title.romaji}
                  </div>
                  <div className="score">
                    <img src={star} alt="star" />
                    {anime.averageScore ? `${anime.averageScore / 10}` : "N/A"}
                  </div>
                  <div className="extra-info">
                    <p className="format">{anime.format}</p>
                    <p className="episodes">{anime.episodes || "?"} eps</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
