import React, { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWatchlist } from '../context/WatchlistContext';
import '../styles/Profile.css';

export default function Profile() {
  const { user } = useAuth();
  const { watchlist } = useWatchlist();

  const stats = useMemo(() => {
    if (!watchlist) return { total: 0, episodes: 0, meanScore: 0, statuses: {} };

    let totalEpisodes = 0;
    let totalScore = 0;
    let scoredCount = 0;
    const statuses = {
      Watching: 0,
      Completed: 0,
      "Plan to Watch": 0,
      Dropped: 0
    };

    watchlist.forEach(anime => {
      // Tally statuses
      if (statuses[anime.status] !== undefined) {
        statuses[anime.status]++;
      }

      // Tally episodes
      if (anime.progress) {
        totalEpisodes += anime.progress;
      }

      // Tally scores (assume rating is 1-10)
      if (anime.rating && anime.rating > 0) {
        totalScore += anime.rating;
        scoredCount++;
      }
    });

    return {
      total: watchlist.length,
      episodes: totalEpisodes,
      meanScore: scoredCount > 0 ? (totalScore / scoredCount).toFixed(1) : 0,
      statuses
    };
  }, [watchlist]);

  if (!user) {
    return <div style={{ color: 'white', textAlign: 'center', marginTop: '50px' }}>Please log in to view your profile.</div>;
  }

  // Calculate percentages for the status bars
  const maxStatusCount = Math.max(...Object.values(stats.statuses), 1); // Avoid division by zero

  return (
    <div className="profile-container">
      <div className="profile-header">
        <img 
          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}&backgroundColor=6366f1`} 
          alt="Profile Avatar" 
          className="profile-avatar" 
        />
        <div className="profile-info">
          <h1>{user.username}</h1>
          <p>PALv2 Member • {stats.total} Anime Tracked</p>
        </div>
      </div>

      <div className="profile-stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Anime</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.episodes}</div>
          <div className="stat-label">Episodes Watched</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.meanScore}</div>
          <div className="stat-label">Mean Score</div>
        </div>
      </div>

      <h2 className="profile-section-title">Status Distribution</h2>
      <div className="status-distribution">
        
        <div className="status-bar-wrapper">
          <div className="status-label">Watching</div>
          <div className="status-bar-bg">
            <div 
              className="status-bar-fill fill-Watching" 
              style={{ width: `${(stats.statuses['Watching'] / maxStatusCount) * 100}%` }}
            ></div>
          </div>
          <div className="status-count">{stats.statuses['Watching']}</div>
        </div>

        <div className="status-bar-wrapper">
          <div className="status-label">Completed</div>
          <div className="status-bar-bg">
            <div 
              className="status-bar-fill fill-Completed" 
              style={{ width: `${(stats.statuses['Completed'] / maxStatusCount) * 100}%` }}
            ></div>
          </div>
          <div className="status-count">{stats.statuses['Completed']}</div>
        </div>

        <div className="status-bar-wrapper">
          <div className="status-label">Plan to Watch</div>
          <div className="status-bar-bg">
            <div 
              className="status-bar-fill fill-Plan" 
              style={{ width: `${(stats.statuses['Plan to Watch'] / maxStatusCount) * 100}%` }}
            ></div>
          </div>
          <div className="status-count">{stats.statuses['Plan to Watch']}</div>
        </div>

        <div className="status-bar-wrapper">
          <div className="status-label">Dropped</div>
          <div className="status-bar-bg">
            <div 
              className="status-bar-fill fill-Dropped" 
              style={{ width: `${(stats.statuses['Dropped'] / maxStatusCount) * 100}%` }}
            ></div>
          </div>
          <div className="status-count">{stats.statuses['Dropped']}</div>
        </div>

      </div>
    </div>
  );
}
