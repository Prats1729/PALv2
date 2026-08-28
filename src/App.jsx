import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import TopBar from "./components/layout/TopBar.jsx";
import BottomNavBar from "./components/layout/BottomNavBar.jsx";
import Home from "./pages/Home.jsx";
import Library from "./pages/Library.jsx";
import Discover from "./pages/Discover.jsx";
import Settings from "./pages/Settings.jsx";
import Profile from "./pages/Profile.jsx";
import AnimeDetails from "./pages/AnimeDetails.jsx";
import Search from "./pages/Search.jsx";
import ContinueWatching from "./pages/ContinueWatching.jsx";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import UpdateModal from "./components/common/UpdateModal.jsx";
import PatchNotesModal from "./components/common/PatchNotesModal.jsx";
import { checkForAppUpdates, checkPatchNotesOnStartup } from "./utils/updater.js";

import { WatchlistProvider } from "./context/WatchlistContext.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";

import "./App.css";

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#fff' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  return children;
};

export default function App() {
  const [toast, setToast] = useState(null);
  const [authPrompt, setAuthPrompt] = useState(null);
  const [availableUpdate, setAvailableUpdate] = useState(null);
  const [patchNotes, setPatchNotes] = useState(null);

  // Check for post-update patch notes & background updates on app launch
  useEffect(() => {
    // 1. Check if user just updated to a new version to show patch notes once
    const checkNotes = async () => {
      const notes = await checkPatchNotesOnStartup();
      if (notes) {
        setPatchNotes(notes);
      }
    };
    checkNotes();

    // 2. Check for newly available updates after a brief delay
    const timer = setTimeout(async () => {
      const update = await checkForAppUpdates(false);
      if (update) {
        setAvailableUpdate(update);
      }
    }, 3000);

    const handleCheckUpdateEvent = async (e) => {
      const interactive = Boolean(e?.detail?.interactive);
      const update = await checkForAppUpdates(interactive);
      if (update) {
        setAvailableUpdate(update);
      }
    };

    window.addEventListener("pal-check-update", handleCheckUpdateEvent);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pal-check-update", handleCheckUpdateEvent);
    };
  }, []);

  useEffect(() => {
    let timer;
    const handleToast = (e) => {
      if (timer) clearTimeout(timer);
      setToast({ message: e.detail.message, type: e.detail.type });
      timer = setTimeout(() => {
        setToast(null);
      }, 3000);
    };

    const handleAuthPrompt = (e) => {
      setAuthPrompt(e.detail || { message: "Sign in or create an account to use this feature." });
    };

    window.addEventListener("pal-toast", handleToast);
    window.addEventListener("pal-auth-prompt", handleAuthPrompt);
    return () => {
      window.removeEventListener("pal-toast", handleToast);
      window.removeEventListener("pal-auth-prompt", handleAuthPrompt);
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Handle Light/Dark theme overrides globally on document.body
  useEffect(() => {
    const updateBodyTheme = (isDark) => {
      if (isDark) {
        document.body.classList.add("dark-theme");
      } else {
        document.body.classList.remove("dark-theme");
      }
    };
    
    // Initial check
    const savedTheme = localStorage.getItem("pal-theme");
    updateBodyTheme(savedTheme === "dark");

    const handleThemeChange = (e) => {
      updateBodyTheme(e.detail);
    };

    window.addEventListener("pal-theme-change", handleThemeChange);
    return () => window.removeEventListener("pal-theme-change", handleThemeChange);
  }, []);

  return (
    <AuthProvider>
      <WatchlistProvider>
        <BrowserRouter>
          <div className="app-container">
            {/* Top Navigation */}
            <TopBar />

            <main className="main-content">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
                <Route path="/continue-watching" element={<ProtectedRoute><ContinueWatching /></ProtectedRoute>} />
                <Route path="/discover" element={<ProtectedRoute><Discover /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/statistics" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/anime/:id" element={<ProtectedRoute><AnimeDetails /></ProtectedRoute>} />
                <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            
            <BottomNavBar />

            {/* Global Toast Alert */}
            {toast && (
              <div className={`toast-notification toast-${toast.type}`}>
                {toast.message}
              </div>
            )}

            {/* Global Auth Prompt Modal for Guests */}
            {authPrompt && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                  backdropFilter: "blur(4px)",
                  zIndex: 10000,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "20px"
                }}
                onClick={() => setAuthPrompt(null)}
              >
                <div
                  style={{
                    backgroundColor: "#14111d",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "12px",
                    maxWidth: "420px",
                    width: "100%",
                    padding: "24px",
                    color: "#fff",
                    textAlign: "center",
                    boxShadow: "none"
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ marginBottom: "14px", color: "#6366f1" }}>
                    <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </div>
                  <h3 style={{ margin: "0 0 8px 0", fontSize: "20px", fontWeight: "700" }}>
                    Account Required
                  </h3>
                  <p style={{ color: "#94a3b8", fontSize: "13px", lineHeight: "1.5", margin: "0 0 20px 0" }}>
                    {authPrompt.message || "Sign in or create a free PAL account to build your personal watchlist and track your anime progress."}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <a
                      href="/login"
                      style={{
                        backgroundColor: "#6366f1",
                        color: "#fff",
                        padding: "10px 16px",
                        borderRadius: "6px",
                        textDecoration: "none",
                        fontWeight: "600",
                        fontSize: "13px"
                      }}
                      onClick={() => setAuthPrompt(null)}
                    >
                      Sign In
                    </a>
                    <a
                      href="/register"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        color: "#e2e8f0",
                        padding: "10px 16px",
                        borderRadius: "6px",
                        textDecoration: "none",
                        fontWeight: "600",
                        fontSize: "13px"
                      }}
                      onClick={() => setAuthPrompt(null)}
                    >
                      Create Free Account
                    </a>
                    <button
                      type="button"
                      onClick={() => setAuthPrompt(null)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#888",
                        fontSize: "12px",
                        cursor: "pointer",
                        marginTop: "4px"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = "#ccc"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "#888"}
                    >
                      Continue Browsing
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Global Update Modal */}
            {availableUpdate && (
              <UpdateModal
                update={availableUpdate}
                onClose={() => setAvailableUpdate(null)}
              />
            )}

            {/* Post-Update Patch Notes Modal */}
            {patchNotes && (
              <PatchNotesModal
                patchNotes={patchNotes}
                onClose={() => setPatchNotes(null)}
              />
            )}
          </div>
        </BrowserRouter>
      </WatchlistProvider>
    </AuthProvider>
  );
}
