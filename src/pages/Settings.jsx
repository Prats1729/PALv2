import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useWatchlist } from "../context/WatchlistContext";
import { useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";
import { getCurrentAppVersion, checkForAppUpdates } from "../utils/updater";
import AvatarPickerModal from "../components/common/AvatarPickerModal";
import "../styles/Settings.css";

const CLIENT_ID = import.meta.env.VITE_ANILIST_CLIENT_ID;
const REDIRECT_URI = window.location.origin + "/settings";

export default function Settings() {
  const { token, user, setUser, updateUsername, updatePassword, deleteAccount } = useAuth();
  const { fetchWatchlist } = useWatchlist();
  const location = useLocation();
  const navigate = useNavigate();
  const [appVersion, setAppVersion] = useState("2.1.9");
  const [anilistLinked, setAnilistLinked] = useState(user?.hasAnilistToken || false);
  const [linkingStatus, setLinkingStatus] = useState(null);
  const [importStatus, setImportStatus] = useState(null); // null | 'importing' | 'done' | 'error'
  const [importMessage, setImportMessage] = useState('');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  // Avatar Modal State
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Change Username Modal State
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [newUsernameInput, setNewUsernameInput] = useState("");
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameError, setUsernameError] = useState(null);

  // Change Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState(null);

  // 2-Level Delete Account State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem("pal_theme") || "midnight";
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
    apiFetch('/api/auth/link-anilist', {
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

  // Load app version
  useEffect(() => {
    getCurrentAppVersion().then((v) => {
      if (v) setAppVersion(v);
    });
  }, []);

  const handleConnectAniList = () => {
    const redirect = encodeURIComponent(REDIRECT_URI);
    const authUrl = `https://anilist.co/api/v2/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${redirect}&response_type=token`;
    window.location.href = authUrl;
  };

  const handleDisconnectAniList = async () => {
    try {
      const res = await apiFetch('/api/auth/unlink-anilist', {
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
      const res = await apiFetch('/api/watchlist/import-anilist', {
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

  const handleThemeSelect = (themeId, themeName) => {
    setCurrentTheme(themeId);
    localStorage.setItem("pal_theme", themeId);
    document.body.classList.remove("theme-midnight", "theme-google-dark", "theme-oled", "theme-light", "dark-theme");
    document.body.classList.add(`theme-${themeId}`);
    document.documentElement.setAttribute("data-theme", themeId);
    window.dispatchEvent(new CustomEvent("pal-theme-select", { detail: themeId }));
    window.dispatchEvent(
      new CustomEvent("pal-toast", {
        detail: { message: `Theme switched to ${themeName}!`, type: "success" },
      })
    );
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
          <h3 className="settings-card-title">Appearance & Theme</h3>
          <p className="settings-card-desc">Choose the visual style that suits your viewing experience.</p>
          
          <div className="theme-selector-grid">
            {/* Theme 1: Midnight Purple (Default) */}
            <div
              className={`theme-option-card ${currentTheme === 'midnight' ? 'active' : ''}`}
              onClick={() => handleThemeSelect('midnight', 'Midnight Purple')}
            >
              <div className="theme-card-preview theme-preview-midnight">
                <div className="theme-swatch-bar">
                  <span style={{ backgroundColor: '#0b0813' }} />
                  <span style={{ backgroundColor: '#1a1822' }} />
                  <span style={{ backgroundColor: '#6366f1' }} />
                </div>
              </div>
              <div className="theme-card-body">
                <div className="theme-card-header">
                  <span className="theme-card-name">Midnight Purple</span>
                  {currentTheme === 'midnight' && <span className="theme-badge-active">Active</span>}
                </div>
                <p className="theme-card-desc">Deep cyber violet with neon indigo accents (Default)</p>
              </div>
            </div>

            {/* Theme 2: Google Dark (Clean Slate) */}
            <div
              className={`theme-option-card ${currentTheme === 'google-dark' ? 'active' : ''}`}
              onClick={() => handleThemeSelect('google-dark', 'Google Slate Dark')}
            >
              <div className="theme-card-preview theme-preview-google">
                <div className="theme-swatch-bar">
                  <span style={{ backgroundColor: '#121212' }} />
                  <span style={{ backgroundColor: '#1e1e1e' }} />
                  <span style={{ backgroundColor: '#8ab4f8' }} />
                </div>
              </div>
              <div className="theme-card-body">
                <div className="theme-card-header">
                  <span className="theme-card-name">Google Slate Dark</span>
                  {currentTheme === 'google-dark' && <span className="theme-badge-active">Active</span>}
                </div>
                <p className="theme-card-desc">Matte dark gray, refined crisp borders & Material Blue</p>
              </div>
            </div>

            {/* Theme 3: OLED Pitch Black */}
            <div
              className={`theme-option-card ${currentTheme === 'oled' ? 'active' : ''}`}
              onClick={() => handleThemeSelect('oled', 'OLED Pure Black')}
            >
              <div className="theme-card-preview theme-preview-oled">
                <div className="theme-swatch-bar">
                  <span style={{ backgroundColor: '#000000' }} />
                  <span style={{ backgroundColor: '#111111' }} />
                  <span style={{ backgroundColor: '#38bdf8' }} />
                </div>
              </div>
              <div className="theme-card-body">
                <div className="theme-card-header">
                  <span className="theme-card-name">OLED Pure Black</span>
                  {currentTheme === 'oled' && <span className="theme-badge-active">Active</span>}
                </div>
                <p className="theme-card-desc">True #000000 pitch black for OLED displays & high contrast</p>
              </div>
            </div>

            {/* Theme 4: Nordic Clean Light */}
            <div
              className={`theme-option-card ${currentTheme === 'light' ? 'active' : ''}`}
              onClick={() => handleThemeSelect('light', 'Nordic Clean Light')}
            >
              <div className="theme-card-preview theme-preview-light">
                <div className="theme-swatch-bar">
                  <span style={{ backgroundColor: '#f6f8fa' }} />
                  <span style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }} />
                  <span style={{ backgroundColor: '#4f46e5' }} />
                </div>
              </div>
              <div className="theme-card-body">
                <div className="theme-card-header">
                  <span className="theme-card-name">Nordic Clean Light</span>
                  {currentTheme === 'light' && <span className="theme-badge-active">Active</span>}
                </div>
                <p className="theme-card-desc">Crisp porcelain background, elevated cards & Royal Indigo accents</p>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-card">
          <h3 className="settings-card-title">Account Settings</h3>
          <p className="settings-card-desc">Manage your PAL profile picture, username, and password credentials.</p>
          
          {user && !user.isGuest ? (
            <div className="settings-account-profile-box">
              <div className="settings-account-header">
                <img 
                  src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}&backgroundColor=6366f1`}
                  alt="Profile"
                  className="settings-account-avatar"
                  onClick={() => setShowAvatarPicker(true)}
                  title="Click to change avatar"
                />
                <div className="settings-account-meta">
                  <div className="settings-account-name">{user.username}</div>
                  <div className="settings-account-email">{user.email || "No email linked"}</div>
                </div>
              </div>

              <div className="settings-account-buttons-row">
                <button 
                  className="settings-secondary-btn"
                  onClick={() => setShowAvatarPicker(true)}
                >
                  Change Avatar
                </button>
                <button 
                  className="settings-secondary-btn" 
                  onClick={() => {
                    setNewUsernameInput(user.username);
                    setUsernameError(null);
                    setShowUsernameModal(true);
                  }}
                >
                  Change Username
                </button>
                <button 
                  className="settings-secondary-btn" 
                  onClick={() => {
                    setCurrentPasswordInput("");
                    setNewPasswordInput("");
                    setConfirmPasswordInput("");
                    setPasswordError(null);
                    setShowPasswordModal(true);
                  }}
                >
                  Change Password
                </button>
              </div>
            </div>
          ) : (
            <div className="settings-account-guest-hint">
              <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "10px" }}>
                You are currently browsing in Guest Mode.
              </p>
              <button 
                className="settings-auth-btn" 
                onClick={() => navigate("/register")}
              >
                Create an Account
              </button>
            </div>
          )}
        </div>

        <div className="settings-card">
          <h3 className="settings-card-title">Application & Updates</h3>
          <p className="settings-card-desc">
            Keep PALv2 updated with the latest features, bug fixes, and improvements.
          </p>
          <div className="settings-updates-container">
            <div className="settings-update-row">
              <span>Current Version:</span>
              <span className="settings-version-badge">v{appVersion}</span>
            </div>
            <div className="settings-update-row">
              <span>OTA Updates:</span>
              <span className="settings-ota-status">● Enabled</span>
            </div>
            <button
              className="settings-auth-btn"
              style={{
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                minHeight: '38px',
                opacity: isCheckingUpdate ? 0.8 : 1,
                cursor: isCheckingUpdate ? 'wait' : 'pointer'
              }}
              disabled={isCheckingUpdate}
              onClick={async () => {
                setIsCheckingUpdate(true);
                try {
                  const update = await checkForAppUpdates(true);
                  if (update) {
                    window.dispatchEvent(new CustomEvent("pal-available-update", { detail: update }));
                  }
                } catch (err) {
                  console.error("Update check error:", err);
                } finally {
                  setIsCheckingUpdate(false);
                }
              }}
            >
              {isCheckingUpdate ? (
                <>
                  <span
                    style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTopColor: '#ffffff',
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'spin 0.8s linear infinite'
                    }}
                  />
                  <span>Checking for updates...</span>
                </>
              ) : (
                "Check for Updates"
              )}
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

      {/* Avatar Picker Modal */}
      <AvatarPickerModal 
        isOpen={showAvatarPicker}
        onClose={() => setShowAvatarPicker(false)}
      />

      {/* Change Username Modal */}
      {showUsernameModal && (
        <div 
          className="auth-modal-overlay" 
          onClick={() => { if (!usernameLoading) setShowUsernameModal(false); }}
        >
          <div className="auth-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <button 
              type="button" 
              className="auth-modal-close"
              onClick={() => setShowUsernameModal(false)}
              disabled={usernameLoading}
            >
              ✕
            </button>

            <h3 style={{ color: 'var(--text-primary, #fff)', margin: '0 0 8px 0', fontSize: '1.25rem', textAlign: 'center' }}>
              Change Username
            </h3>
            <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.85rem', lineHeight: '1.4', marginBottom: '18px', textAlign: 'center' }}>
              Choose a new username for your PAL account.
            </p>

            {usernameError && <div className="auth-error" style={{ marginBottom: '14px' }}>{usernameError}</div>}

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (newUsernameInput.trim() === user?.username) {
                setShowUsernameModal(false);
                return;
              }
              setUsernameLoading(true);
              setUsernameError(null);
              try {
                await updateUsername(newUsernameInput.trim());
                window.dispatchEvent(
                  new CustomEvent("pal-toast", {
                    detail: { message: `Username updated to ${newUsernameInput.trim()}!`, type: "success" },
                  })
                );
                setShowUsernameModal(false);
              } catch (err) {
                setUsernameError(err.message || "Failed to update username");
              } finally {
                setUsernameLoading(false);
              }
            }}>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text-secondary, #94a3b8)' }}>New Username</label>
                <input
                  type="text"
                  placeholder="Enter new username"
                  value={newUsernameInput}
                  onChange={(e) => setNewUsernameInput(e.target.value)}
                  minLength={3}
                  maxLength={30}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="settings-auth-btn"
                  style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--text-primary, #fff)' }}
                  onClick={() => setShowUsernameModal(false)}
                  disabled={usernameLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="settings-auth-btn"
                  style={{ flex: 1.2 }}
                  disabled={usernameLoading || !newUsernameInput.trim() || newUsernameInput.trim() === user?.username}
                >
                  {usernameLoading ? "Updating..." : "Save Username"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div 
          className="auth-modal-overlay" 
          onClick={() => { if (!passwordLoading) setShowPasswordModal(false); }}
        >
          <div className="auth-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <button 
              type="button" 
              className="auth-modal-close"
              onClick={() => setShowPasswordModal(false)}
              disabled={passwordLoading}
            >
              ✕
            </button>

            <h3 style={{ color: 'var(--text-primary, #fff)', margin: '0 0 8px 0', fontSize: '1.25rem', textAlign: 'center' }}>
              Change Password
            </h3>
            <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.85rem', lineHeight: '1.4', marginBottom: '18px', textAlign: 'center' }}>
              Enter your current password and choose a secure new password.
            </p>

            {passwordError && <div className="auth-error" style={{ marginBottom: '14px' }}>{passwordError}</div>}

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (newPasswordInput !== confirmPasswordInput) {
                setPasswordError("New passwords do not match");
                return;
              }
              if (newPasswordInput.length < 6) {
                setPasswordError("Password must be at least 6 characters long");
                return;
              }

              setPasswordLoading(true);
              setPasswordError(null);
              try {
                await updatePassword(currentPasswordInput, newPasswordInput);
                window.dispatchEvent(
                  new CustomEvent("pal-toast", {
                    detail: { message: "Password updated successfully!", type: "success" },
                  })
                );
                setShowPasswordModal(false);
              } catch (err) {
                setPasswordError(err.message || "Failed to update password");
              } finally {
                setPasswordLoading(false);
              }
            }}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text-secondary, #94a3b8)' }}>Current Password</label>
                <input
                  type="password"
                  placeholder="Enter current password"
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text-secondary, #94a3b8)' }}>New Password</label>
                <input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  minLength={6}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text-secondary, #94a3b8)' }}>Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  minLength={6}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="settings-auth-btn"
                  style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--text-primary, #fff)' }}
                  onClick={() => setShowPasswordModal(false)}
                  disabled={passwordLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="settings-auth-btn"
                  style={{ flex: 1.2 }}
                  disabled={passwordLoading || !newPasswordInput || !confirmPasswordInput}
                >
                  {passwordLoading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
