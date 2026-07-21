import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchUserWatchlist } from "../services/anilist";
import { getSavedUsernames } from "../services/storage";
import "../styles/Statistics.css";

// Animated Count-Up Component
function AnimatedCounter({ value }) {
  const [displayValue, setDisplayValue] = useState("0");

  useEffect(() => {
    const target = parseFloat(value);
    if (isNaN(target)) {
      setDisplayValue(value);
      return;
    }

    const isInt = Number.isInteger(target) && value.toString().indexOf(".") === -1;
    const duration = 600; // Animation duration in milliseconds
    const startTime = performance.now();

    let frameId;
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const ease = progress * (2 - progress); // easeOutQuad
      const current = target * ease;

      if (isInt) {
        setDisplayValue(Math.floor(current).toString());
      } else {
        setDisplayValue(current.toFixed(1));
      }

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value.toString());
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [value]);

  return <span>{displayValue}</span>;
}

export default function Statistics() {
  const [searchParams, setSearchParams] = useSearchParams();
  const username = searchParams.get("user") || "";
  const [savedUsers] = useState(() => getSavedUsernames());
  const [rawLists, setRawLists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setError(null);
    fetchUserWatchlist(username)
      .then((data) => setRawLists(data))
      .catch((err) =>
        setError(err.message || "Failed to load user statistics."),
      )
      .finally(() => setLoading(false));
  }, [username]);

  // 1. Flatten all entries across all lists (Watching, Completed, Dropped, etc.)
  const allEntries = rawLists.flatMap((l) => l.entries || []);

  // 2. Count total anime titles
  const totalAnime = allEntries.length;

  // 3. Sum up total watched episodes
  const totalEpisodes = allEntries.reduce(
    (sum, e) => sum + (e.progress || 0),
    0,
  );

  // 4. Calculate total days watched (assuming 24 mins average per episode)
  const daysWatched = ((totalEpisodes * 24) / (60 * 24)).toFixed(1);

  // 5. Calculate average score (only for items with score > 0)
  const scoredEntries = allEntries.filter((e) => e.score > 0);
  const meanScore =
    scoredEntries.length > 0
      ? (
          scoredEntries.reduce((sum, e) => sum + e.score, 0) /
          scoredEntries.length
        ).toFixed(1)
      : "N/A";

  return (
    <div className="stats-container">
      <h2 className="stats-title">Anime Statistics</h2>
      <p className="stats-subtitle">
        Your personal watching metrics will calculate here once linked.
      </p>
      {/* Saved User Selector Pills */}
      {savedUsers.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            marginBottom: "20px",
            flexWrap: "wrap",
          }}
        >
          <span style={{ color: "#7a7690", fontSize: "13px" }}>
            Select Profile:
          </span>
          {savedUsers.map((u) => (
            <button
              key={u}
              onClick={() => setSearchParams({ user: u })}
              style={{
                padding: "5px 12px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                background:
                  username.toLowerCase() === u.toLowerCase()
                    ? "#6366f1"
                    : "#181825",
                color: "#fff",
                fontSize: "13px",
              }}
            >
              {u}
            </button>
          ))}
        </div>
      )}

      <div className="stats-grid">
        <div className="stats-card">
          <h3 className="stats-value">
            <AnimatedCounter value={totalAnime} />
          </h3>
          <span className="stats-label">Total Anime</span>
        </div>
        <div className="stats-card">
          <h3 className="stats-value">
            <AnimatedCounter value={totalEpisodes} />
          </h3>
          <span className="stats-label">Episodes Watched</span>
        </div>
        <div className="stats-card">
          <h3 className="stats-value">
            <AnimatedCounter value={daysWatched} />
          </h3>
          <span className="stats-label">Days Watched</span>
        </div>
        <div className="stats-card">
          <h3 className="stats-value">
            {meanScore !== "N/A" ? (
              <>
                <AnimatedCounter value={meanScore} /> <span style={{ fontSize: "16px", opacity: 0.6 }}>/ 10</span>
              </>
            ) : (
              "N/A"
            )}
          </h3>
          <span className="stats-label">Mean Score</span>
        </div>
      </div>
    </div>
  );
}
