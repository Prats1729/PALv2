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

// 1.2 REUSABLE CUSTOM SINGLE-SELECT DROPDOWN COMPONENT
function SingleSelectDropdown({ label, options, selected, onChange, placeholder = "Any" }) {
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

  const getDisplayLabel = (val) => {
    const found = options.find((o) => (typeof o === "object" ? o.value === val : o === val));
    if (!found || val === "") return placeholder;
    return typeof found === "object" ? found.label : found.replace(/_/g, " ");
  };

  return (
    <div className="filter-group" ref={dropdownRef}>
      <label>{label}</label>
      <div className="custom-dropdown">
        <button
          type="button"
          className={`dropdown-trigger ${isOpen ? "open" : ""}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="dropdown-value">{getDisplayLabel(selected)}</span>
          <span className="chevron-arrow"></span>
        </button>

        {isOpen && (
          <div className="dropdown-options-list">
            {options.map((opt) => {
              const val = typeof opt === "object" ? opt.value : opt;
              const display = typeof opt === "object" ? opt.label : opt.replace(/_/g, " ");
              const isSelected = selected === val;

              return (
                <div
                  key={val}
                  className={`dropdown-option-item ${isSelected ? "checked" : ""}`}
                  style={{ cursor: "pointer", padding: "8px 12px" }}
                  onClick={() => {
                    onChange(val);
                    setIsOpen(false);
                  }}
                >
                  <span>{display}</span>
                </div>
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
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") || "";

  // Filter States
  // Read values directly from searchParams
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || "",
  );
  const [year, setYear] = useState(searchParams.get("year") || "");
  const [season, setSeason] = useState(searchParams.get("season") || "");
  const [sortBy, setSortBy] = useState(
    searchParams.get("sort") || "POPULARITY_DESC",
  );

  // For multi-select (comma separated like ?genres=Action,Drama)
  const [selectedGenres, setSelectedGenres] = useState(
    searchParams.get("genres") ? searchParams.get("genres").split(",") : [],
  );
  const [selectedTags, setSelectedTags] = useState(
    searchParams.get("tags") ? searchParams.get("tags").split(",") : [],
  );
  const [selectedFormats, setSelectedFormats] = useState(
    searchParams.get("formats") ? searchParams.get("formats").split(",") : [],
  );
  const [selectedStatus, setSelectedStatus] = useState(
    searchParams.get("status") ? searchParams.get("status").split(",") : [],
  );

  const updateParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);

    if (
      !value ||
      value === "Any" ||
      (Array.isArray(value) && value.length === 0)
    ) {
      newParams.delete(key); // Cleans up empty filters from URL bar
    } else if (Array.isArray(value)) {
      newParams.set(key, value.join(",")); // Turns ["Action", "Drama"] into "Action,Drama"
    } else {
      newParams.set(key, value);
    }

    setSearchParams(newParams); // Pushes new URL without losing other filters
  };


  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setSearchQuery(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    setSearchQuery(searchParams.get("search") || "");
    setYear(searchParams.get("year") || "");
    setSeason(searchParams.get("season") || "");
    setSortBy(searchParams.get("sort") || "POPULARITY_DESC");
    setSelectedGenres(
      searchParams.get("genres") ? searchParams.get("genres").split(",") : [],
    );
    setSelectedTags(
      searchParams.get("tags") ? searchParams.get("tags").split(",") : [],
    );
    setSelectedFormats(
      searchParams.get("formats") ? searchParams.get("formats").split(",") : [],
    );
    setSelectedStatus(
      searchParams.get("status") ? searchParams.get("status").split(",") : [],
    );
  }, [searchParams]);


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
  const sortsList = [
    { value: "POPULARITY_DESC", label: "Popularity" },
    { value: "SCORE_DESC", label: "Score" },
    { value: "TRENDING_DESC", label: "Trending Now" },
    { value: "START_DATE_DESC", label: "Release Date" },
    { value: "TITLE_ENGLISH_DESC", label: "Title" },
  ];

  return (
    <div className="discover-container">
      <h1 className="catalog-title">Catalog</h1>

      {/* FILTER BAR GRID */}
      <div className="filter-bar">
        <div className="filter-grid-row">
          <MultiSelectDropdown
            label="Genre"
            options={genresList}
            selected={selectedGenres}
            onChange={(val) => {
              setSelectedGenres(val);
              updateParam("genres", val);
            }}
          />
          <MultiSelectDropdown
            label="Tags"
            options={tagsList}
            selected={selectedTags}
            onChange={(val) => {
              setSelectedTags(val);
              updateParam("tags", val);
            }}
          />
          <MultiSelectDropdown
            label="Format"
            options={formatsList}
            selected={selectedFormats}
            onChange={(val) => {
              setSelectedFormats(val);
              updateParam("formats", val);
            }}
          />

          {/* Year Selector (Custom Single Select Dropdown) */}
          <SingleSelectDropdown
            label="Year"
            options={yearsList}
            selected={year}
            onChange={(val) => {
              setYear(val);
              updateParam("year", val);
            }}
          />

          {/* Season Selector (Custom Single Select Dropdown) */}
          <SingleSelectDropdown
            label="Season"
            options={seasonsList}
            selected={season}
            onChange={(val) => {
              setSeason(val);
              updateParam("season", val);
            }}
          />

          <MultiSelectDropdown
            label="Status"
            options={statusList}
            selected={selectedStatus}
            onChange={(val) => {
              setSelectedStatus(val);
              updateParam("status", val);
            }}
          />

          {/* Sort By Selector (Custom Single Select Dropdown) */}
          <SingleSelectDropdown
            label="Sort By"
            options={sortsList}
            selected={sortBy}
            onChange={(val) => {
              setSortBy(val);
              updateParam("sort", val);
            }}
          />
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
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      {loading && (
        <div className="anime-grid" style={{ padding: "20px 0 0 0" }}>
          {Array.from({ length: 12 }).map((_, idx) => (
            <div key={idx} className="skeleton-card" />
          ))}
        </div>
      )}

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
