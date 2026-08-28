import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useWatchlist } from "../context/WatchlistContext";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/Settings.css";

const CLIENT_ID = import.meta.env.VITE_ANILIST_CLIENT_ID;
const REDIRECT_URI = window.location.origin + "/settings";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Settings() {
  const { token, user, setUser, deleteAccount } = useAuth();
  const { fetchWatchlist } = useWatchlist();
  const location = useLocation();
  const navigate = useNavigate();
  const [anilistLinked, setAnilistLinked] = useState(user?.hasAnilistToken || false);
  const [linkingStatus, setLinkingStatus] = useState(null);
  const [importStatus, setImportStatus] = useState(null); // null | 'importing' | 'done' | 'error'
  const [importMessage, setImportMessage] = useState('');

  // 2-Level Delete Account State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

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
              detail: { message: "AniList account linked!", type: "success" },
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
                <span className="anilist-connected-badge">Connected</span>
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
            <button 
              className="settings-auth-btn" 
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }} 
              onClick={() => window.dispatchEvent(new CustomEvent("pal-toast", { detail: { message: "Change username feature coming soon!", type: "info" } }))}
            >
              Change Username
            </button>
            <button 
              className="settings-auth-btn" 
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }} 
              onClick={() => window.dispatchEvent(new CustomEvent("pal-toast", { detail: { message: "Change password feature coming soon!", type: "info" } }))}
            >
              Change Password
            </button>
          </div>
        </div>

        <div className="settings-card" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
          <h3 className="settings-card-title" style={{ color: '#f87171' }}>Danger Zone</h3>
          <p className="settings-card-desc">Irreversible account actions.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="settings-auth-btn disconnect" onClick={() => { localStorage.clear(); window.location.reload(); }}>
              Clear Local Cache
            </button>
            <button 
              className="settings-auth-btn disconnect" 
              style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.08)' }} 
              onClick={() => {
                setShowDeleteModal(true);
                setDeleteStep(1);
                setDeleteConfirmText("");
                setDeleteError(null);
              }}
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* 2-Level Account Deletion Modal */}
      {showDeleteModal && (
        <div 
          className="auth-modal-overlay" 
          onClick={() => {
            if (!isDeleting) setShowDeleteModal(false);
          }}
        >
          <div className="auth-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <button 
              type="button" 
              className="auth-modal-close"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              ✕
            </button>

            {deleteStep === 1 ? (
              <div>
                <h3 style={{ color: '#ef4444', margin: '0 0 10px 0', fontSize: '1.3rem', textAlign: 'center' }}>
                  Delete Account (Step 1 of 2)
                </h3>
                <p style={{ color: '#e2e8f0', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '16px', textAlign: 'center' }}>
                  Are you absolutely sure you want to delete your account?
                </p>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '12px', marginBottom: '20px', color: '#fca5a5', fontSize: '0.8rem', lineHeight: '1.4' }}>
                  • All tracked anime in your watchlist will be permanently wiped.<br />
                  • Your watch history, progress, and account credentials will be erased.<br />
                  • This action cannot be undone.
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="settings-auth-btn"
                    style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff' }}
                    onClick={() => setShowDeleteModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="settings-auth-btn disconnect"
                    style={{ flex: 1, backgroundColor: '#ef4444', color: '#fff', borderColor: '#ef4444' }}
                    onClick={() => setDeleteStep(2)}
                  >
                    I Understand, Continue →
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3 style={{ color: '#ef4444', margin: '0 0 10px 0', fontSize: '1.3rem', textAlign: 'center' }}>
                  Final Confirmation (Step 2 of 2)
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', lineHeight: '1.4', marginBottom: '16px', textAlign: 'center' }}>
                  To permanently delete your account, type <strong style={{ color: '#fff' }}>{user?.username}</strong> in the box below:
                </p>

                {deleteError && <div className="auth-error" style={{ marginBottom: '14px' }}>{deleteError}</div>}

                <div className="form-group" style={{ marginBottom: '18px' }}>
                  <input
                    type="text"
                    placeholder={`Type ${user?.username} to confirm`}
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    style={{ borderColor: deleteConfirmText === user?.username ? '#ef4444' : 'rgba(255,255,255,0.1)' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="settings-auth-btn"
                    style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff' }}
                    onClick={() => setDeleteStep(1)}
                    disabled={isDeleting}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    className="settings-auth-btn disconnect"
                    style={{ 
                      flex: 1.2, 
                      backgroundColor: deleteConfirmText === user?.username ? '#ef4444' : 'rgba(239,68,68,0.3)', 
                      color: '#fff', 
                      borderColor: '#ef4444',
                      cursor: deleteConfirmText === user?.username && !isDeleting ? 'pointer' : 'not-allowed'
                    }}
                    disabled={deleteConfirmText !== user?.username || isDeleting}
                    onClick={async () => {
                      setIsDeleting(true);
                      setDeleteError(null);
                      try {
                        await deleteAccount();
                        window.dispatchEvent(
                          new CustomEvent("pal-toast", {
                            detail: { message: "Account and data permanently deleted.", type: "info" },
                          })
                        );
                        navigate("/login");
                      } catch (err) {
                        setDeleteError(err.message || "Failed to delete account");
                        setIsDeleting(false);
                      }
                    }}
                  >
                    {isDeleting ? "Deleting..." : "Permanently Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
