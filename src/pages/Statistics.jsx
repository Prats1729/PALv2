import { useState, useEffect } from "react";
import { useWatchlist } from "../context/WatchlistContext";
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
  const { watchlist } = useWatchlist();

  // 1. Count total anime titles
  const totalAnime = watchlist.length;

  // 2. Sum up total watched episodes
  const totalEpisodes = watchlist.reduce(
    (sum, e) => sum + (e.progress || 0),
    0
  );

  // 3. Calculate total days watched (assuming 24 mins average per episode)
  const daysWatched = ((totalEpisodes * 24) / (60 * 24)).toFixed(1);

  // 4. Calculate average score (only for items with score > 0)
  const scoredEntries = watchlist.filter((e) => e.rating > 0);
  const meanScore =
    scoredEntries.length > 0
      ? (
          scoredEntries.reduce((sum, e) => sum + e.rating, 0) /
          scoredEntries.length
        ).toFixed(1)
      : "N/A";

  return (
    <div className="stats-container">
      <h2 className="stats-title">Anime Statistics</h2>
      <p className="stats-subtitle">
        Your personal watching metrics synced directly with your database.
      </p>

      {/* METRICS GRID */}
      <div className="stats-grid">
        <div className="stats-card">
          <div className="stats-value" style={{ color: "#6366f1" }}>
            <AnimatedCounter value={totalAnime} />
          </div>
          <div className="stats-label">TOTAL ANIME</div>
        </div>

        <div className="stats-card">
          <div className="stats-value" style={{ color: "#a855f7" }}>
            <AnimatedCounter value={totalEpisodes} />
          </div>
          <div className="stats-label">EPISODES WATCHED</div>
        </div>

        <div className="stats-card">
          <div className="stats-value" style={{ color: "#ec4899" }}>
            <AnimatedCounter value={daysWatched} />
          </div>
          <div className="stats-label">DAYS WATCHED</div>
        </div>

        <div className="stats-card">
          <div className="stats-value" style={{ color: "#10b981" }}>
            <AnimatedCounter value={meanScore} />
            <span style={{ fontSize: "16px", opacity: 0.6 }}> /10</span>
          </div>
          <div className="stats-label">MEAN SCORE</div>
        </div>
      </div>
    </div>
  );
}
