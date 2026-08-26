import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TopBar from "./components/layout/TopBar.jsx";
import BottomNavBar from "./components/layout/BottomNavBar.jsx";
import Home from "./pages/Home.jsx";
import Library from "./pages/Library.jsx";
import Discover from "./pages/Discover.jsx";
import Settings from "./pages/Settings.jsx";
import Profile from "./pages/Profile.jsx";
import AnimeDetails from "./pages/AnimeDetails.jsx";
import Search from "./pages/Search.jsx";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

import { WatchlistProvider } from "./context/WatchlistContext.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { Navigate } from "react-router-dom";

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

  useEffect(() => {
    let timer;
    const handleToast = (e) => {
      if (timer) clearTimeout(timer);
      setToast({ message: e.detail.message, type: e.detail.type });
      timer = setTimeout(() => {
        setToast(null);
      }, 3000);
    };

    window.addEventListener("pal-toast", handleToast);
    return () => {
      window.removeEventListener("pal-toast", handleToast);
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
            {/* We will conditionally render TopBar and BottomNavBar based on the route, 
                but for simplicity, we'll let them handle it internally or assume they show on all routes.
                Actually, login and register shouldn't have nav bars if possible, but let's keep it simple for now. */}
          <TopBar />

          <main className="main-content">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
              <Route path="/discover" element={<ProtectedRoute><Discover /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/anime/:id" element={<ProtectedRoute><AnimeDetails /></ProtectedRoute>} />
              <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
            </Routes>
          </main>
          
          <BottomNavBar />

          {/* Global Toast Alert */}
          {toast && (
            <div className={`toast-notification toast-${toast.type}`}>
              {toast.message}
            </div>
          )}
        </div>
      </BrowserRouter>
      </WatchlistProvider>
    </AuthProvider>
  );
}
