import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useWatchlist } from "../context/WatchlistContext";
import { useLocation } from "react-router-dom";
import "../styles/Settings.css";

const CLIENT_ID = import.meta.env.VITE_ANILIST_CLIENT_ID;
const REDIRECT_URI = window.location.origin + "/settings";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Settings() {
  const { token, user, setUser } = useAuth();
  const { fetchWatchlist } = useWatchlist();
  const location = useLocation();
  const [anilistLinked, setAnilistLinked] = useState(user?.hasAnilistToken || false);
  const [linkingStatus, setLinkingStatus] = useState(null);
  const [importStatus, setImportStatus] = useState(null); // null | 'importing' | 'done' | 'error'
  const [importMessage, setImportMessage] = useState('');

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("pal_dark_mode") !== "false";
  });

  // Capture AniList token from URL hash after OAuth redirect
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("access_token")) return;

    const params = new URLSearchParams(hash.replace("#", "?"));
    const accessToken = params.get("access_token");
    if (!accessToken) return;

    // Clear hash from URL
    window.history.replaceState(null, "", window.location.pathname);

    // Send to backend for encrypted storage
    setLinkingStatus("linking");
    fetch(`${API_URL}/api/auth/link-anilist`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ anilistToken: accessToken }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.hasAnilistToken) {
          setAnilistLinked(true);
          setLinkingStatus("success");
          // Update stored user
          const updatedUser = { ...user, hasAnilistToken: true };
          setUser(updatedUser);
          localStorage.setItem("user", JSON.stringify(updatedUser));
          window.dispatchEvent(
            new CustomEvent("pal-toast", {
              detail: { message: "AniList account linked! 🎉", type: "success" },
            })
          );
        } else {
          setLinkingStatus("error");
        }
      })
      .catch(() => setLinkingStatus("error"));
  }, [location]);

  const handleConnectAniList = () => {
    const authUrl = `https://anilist.co/api/v2/oauth/authorize?client_id=${CLIENT_ID}&response_type=token`;
    window.location.href = authUrl;
  };

  const handleDisconnectAniList = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/unlink-anilist`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.hasAnilistToken && data.hasAnilistToken !== undefined) {
        setAnilistLinked(false);
        const updatedUser = { ...user, hasAnilistToken: false };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        window.dispatchEvent(
          new CustomEvent("pal-toast", {
            detail: { message: "AniList account disconnected", type: "info" },
          })
        );
      }
    } catch (err) {
      console.error("Unlink error:", err);
    }
  };

  const handleImportAniList = async () => {
    setImportStatus('importing');
    setImportMessage('');
    try {
      const res = await fetch(`${API_URL}/api/watchlist/import-anilist`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setImportStatus('done');
        setImportMessage(data.message);
        fetchWatchlist(); // Refresh the local watchlist
        window.dispatchEvent(new CustomEvent("pal-toast", {
          detail: { message: data.message, type: "success" },
        }));
      } else {
        setImportStatus('error');
        setImportMessage(data.error);
      }
    } catch (err) {
      setImportStatus('error');
      setImportMessage('Network error during import');
    }
  };

  const handleToggle = (e) => {
    const checked = e.target.checked;
    setDarkMode(checked);
    localStorage.setItem("pal_dark_mode", checked);
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
            {anilistLinked
              ? "Your AniList account is connected. Changes to your watchlist will sync automatically."
              : "Connect your AniList account to synchronize watch status, scores, and library progress automatically."}
          </p>

          {linkingStatus === "linking" && (
            <p className="settings-linking-status">Linking your account...</p>
          )}

          {anilistLinked ? (
            <>
              <div className="settings-anilist-connected">
                <span className="anilist-connected-badge">✓ Connected</span>
                <button
                  className="settings-auth-btn disconnect"
                  onClick={handleDisconnectAniList}
                >
                  Disconnect
                </button>
              </div>
              <button
                className="settings-auth-btn import"
                onClick={handleImportAniList}
                disabled={importStatus === 'importing'}
                style={{ marginTop: '16px' }}
              >
                {importStatus === 'importing' ? 'Importing...' : 'Import AniList Watchlist'}
              </button>
              {importMessage && (
                <p className={`settings-import-msg ${importStatus}`}>{importMessage}</p>
              )}
            </>
          ) : (
            <button className="settings-auth-btn" onClick={handleConnectAniList}>
              Connect AniList
            </button>
          )}
        </div>

        <div className="settings-card">
          <h3 className="settings-card-title">Appearance</h3>
          <p className="settings-card-desc">Customize how PAL looks for you.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <label className="settings-checkbox-label">
              <input type="checkbox" checked={darkMode} onChange={handleToggle} />{" "}
              Dark Mode Layout
            </label>
            <div>
              <label style={{ display: 'block', color: '#959595', fontSize: '14px', marginBottom: '8px' }}>Accent Color (Coming Soon)</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {['#6366f1', '#10b981', '#f43f5e', '#f59e0b'].map(color => (
                  <div key={color} style={{
                    width: '24px', height: '24px', borderRadius: '50%', backgroundColor: color,
                    cursor: 'not-allowed', border: color === '#6366f1' ? '2px solid white' : 'none'
                  }} title="Coming Soon"></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="settings-card">
          <h3 className="settings-card-title">Account Settings</h3>
          <p className="settings-card-desc">Manage your PAL account details.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="settings-auth-btn" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }} onClick={() => alert("Change username coming soon!")}>
              Change Username
            </button>
            <button className="settings-auth-btn" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }} onClick={() => alert("Change password coming soon!")}>
              Change Password
            </button>
          </div>
        </div>

        <div className="settings-card">
          <h3 className="settings-card-title">Data Management</h3>
          <p className="settings-card-desc">Advanced options for your data.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="settings-auth-btn disconnect" onClick={() => { localStorage.clear(); window.location.reload(); }}>
              Clear Local Cache
            </button>
            <button className="settings-auth-btn disconnect" style={{ color: '#ef4444', borderColor: '#ef4444', marginTop: '10px' }} onClick={() => alert("Delete account coming soon!")}>
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
