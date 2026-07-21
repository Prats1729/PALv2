import { useState } from "react";
import "../styles/Settings.css";

export default function Settings() {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("pal_dark_mode") !== "false";
  });

  const handleToggle = (e) => {
    const checked = e.target.checked;
    setDarkMode(checked);
    localStorage.setItem("pal_dark_mode", checked);
    
    // Dispatch custom event to let App.jsx catch theme change instantly
    window.dispatchEvent(new CustomEvent("pal-theme-change", { detail: checked }));
  };

  return (
    <div className="settings-container">
      <h2 className="settings-title">Settings</h2>
      <p className="settings-subtitle">
        Manage your preferences and platform integrations.
      </p>

      <div className="settings-section-grid">
        <div className="settings-card">
          <h3 className="settings-card-title">AniList Account</h3>
          <p className="settings-card-desc">
            Connect your AniList account to synchronize watch status, scores, and library progress automatically.
          </p>
          <button className="settings-auth-btn">
            Connect AniList (OAuth Pending)
          </button>
        </div>

        <div className="settings-card">
          <h3 className="settings-card-title">Preferences</h3>
          <label className="settings-checkbox-label">
            <input type="checkbox" checked={darkMode} onChange={handleToggle} /> Dark Mode Layout
          </label>
        </div>
      </div>
    </div>
  );
}
